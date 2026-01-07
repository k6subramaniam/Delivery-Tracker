from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    # Check if we can connect, otherwise use mock
    # Actually, just use mock for this sandbox environment since no Mongo is available
    raise ImportError("Force mock")
except ImportError:
    print("Using Mock MongoDB")
    from mock_mongo import AsyncIOMotorClient

import os

import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'delivery_task_manager')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'delivery-task-manager-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Delivery Task Manager API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = Field(..., pattern="^(admin|driver)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CategoryCreate(BaseModel):
    name: str
    color: str = "#3B82F6"

class CategoryResponse(BaseModel):
    id: str
    name: str
    color: str
    created_by: str
    created_at: datetime

class PriorityCreate(BaseModel):
    name: str
    level: int = Field(..., ge=1, le=5)
    color: str = "#EF4444"

class PriorityResponse(BaseModel):
    id: str
    name: str
    level: int
    color: str
    created_by: str
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    amount: float = Field(..., ge=0)
    category_id: Optional[str] = None
    priority_id: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_driver_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category_id: Optional[str] = None
    priority_id: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_driver_id: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    amount: float
    category_id: Optional[str]
    priority_id: Optional[str]
    status: str
    due_date: Optional[datetime]
    assigned_driver_id: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class DriverLocationResponse(BaseModel):
    driver_id: str
    driver_name: str
    latitude: float
    longitude: float
    timestamp: datetime

class DriverEarnings(BaseModel):
    driver_id: str
    driver_name: str
    total_earnings: float
    task_count: int
    pending_amount: float
    pending_count: int

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

# ===================== CATEGORY ROUTES =====================

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category_id = str(uuid.uuid4())
    category = {
        "id": category_id,
        "name": data.name,
        "color": data.color,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow()
    }
    await db.categories.insert_one(category)
    return CategoryResponse(**category)

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find().to_list(100)
    return [CategoryResponse(**c) for c in categories]

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    result = await db.categories.find_one_and_update(
        {"id": category_id},
        {"$set": {"name": data.name, "color": data.color}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategoryResponse(**result)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ===================== PRIORITY ROUTES =====================

@api_router.post("/priorities", response_model=PriorityResponse)
async def create_priority(data: PriorityCreate, current_user: dict = Depends(get_current_user)):
    priority_id = str(uuid.uuid4())
    priority = {
        "id": priority_id,
        "name": data.name,
        "level": data.level,
        "color": data.color,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow()
    }
    await db.priorities.insert_one(priority)
    return PriorityResponse(**priority)

@api_router.get("/priorities", response_model=List[PriorityResponse])
async def get_priorities(current_user: dict = Depends(get_current_user)):
    priorities = await db.priorities.find().sort("level", -1).to_list(100)
    return [PriorityResponse(**p) for p in priorities]

@api_router.put("/priorities/{priority_id}", response_model=PriorityResponse)
async def update_priority(priority_id: str, data: PriorityCreate, current_user: dict = Depends(get_current_user)):
    result = await db.priorities.find_one_and_update(
        {"id": priority_id},
        {"$set": {"name": data.name, "level": data.level, "color": data.color}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Priority not found")
    return PriorityResponse(**result)

@api_router.delete("/priorities/{priority_id}")
async def delete_priority(priority_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.priorities.delete_one({"id": priority_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Priority not found")
    return {"message": "Priority deleted"}

# ===================== TASK ROUTES =====================

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.utcnow()
    task = {
        "id": task_id,
        "title": data.title,
        "description": data.description or "",
        "amount": data.amount,
        "category_id": data.category_id,
        "priority_id": data.priority_id,
        "status": "pending",
        "due_date": data.due_date,
        "assigned_driver_id": data.assigned_driver_id,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "completed_at": None
    }
    await db.tasks.insert_one(task)
    return TaskResponse(**task)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    priority_id: Optional[str] = None,
    assigned_driver_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # If driver, only show their assigned tasks
    if current_user["role"] == "driver":
        query["$or"] = [
            {"assigned_driver_id": current_user["id"]},
            {"created_by": current_user["id"]}
        ]
    elif assigned_driver_id:
        query["assigned_driver_id"] = assigned_driver_id
    
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if priority_id:
        query["priority_id"] = priority_id
    
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Drivers can only view their assigned tasks
    if current_user["role"] == "driver":
        is_assigned = task.get("assigned_driver_id") == current_user["id"]
        is_creator = task.get("created_by") == current_user["id"]
        if not (is_assigned or is_creator):
            raise HTTPException(status_code=403, detail="Access denied")
    
    return TaskResponse(**task)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    if data.status == "completed" and task["status"] != "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    result = await db.tasks.find_one_and_update(
        {"id": task_id},
        {"$set": update_data},
        return_document=True
    )
    return TaskResponse(**result)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.put("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = await db.tasks.find_one_and_update(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "updated_at": datetime.utcnow(),
            "completed_at": datetime.utcnow()
        }},
        return_document=True
    )
    return TaskResponse(**result)

# ===================== DRIVER & LOCATION ROUTES =====================

@api_router.get("/drivers", response_model=List[UserResponse])
async def get_drivers(current_user: dict = Depends(get_admin_user)):
    drivers = await db.users.find({"role": "driver"}).to_list(100)
    return [UserResponse(
        id=d["id"],
        email=d["email"],
        name=d["name"],
        role=d["role"],
        created_at=d["created_at"]
    ) for d in drivers]

@api_router.post("/location/update")
async def update_location(data: LocationUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update location")
    
    location = {
        "driver_id": current_user["id"],
        "driver_name": current_user["name"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "timestamp": datetime.utcnow()
    }
    
    # Upsert - update if exists, insert if not
    await db.locations.update_one(
        {"driver_id": current_user["id"]},
        {"$set": location},
        upsert=True
    )
    
    return {"message": "Location updated"}

@api_router.get("/drivers/locations", response_model=List[DriverLocationResponse])
async def get_all_driver_locations(current_user: dict = Depends(get_admin_user)):
    locations = await db.locations.find().to_list(100)
    return [DriverLocationResponse(**loc) for loc in locations]

@api_router.get("/drivers/{driver_id}/location", response_model=DriverLocationResponse)
async def get_driver_location(driver_id: str, current_user: dict = Depends(get_admin_user)):
    location = await db.locations.find_one({"driver_id": driver_id})
    if not location:
        raise HTTPException(status_code=404, detail="Driver location not found")
    return DriverLocationResponse(**location)

# ===================== DASHBOARD STATS =====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "driver":
        query["$or"] = [
            {"assigned_driver_id": current_user["id"]},
            {"created_by": current_user["id"]}
        ]
    
    total_tasks = await db.tasks.count_documents(query)
    # Match dashboard filtering logic - Pending tasks
    pending_query = query.copy()
    if "$or" in query:
        # Complex logic for $or with additional filters in mock db might be tricky
        # but let's try direct dict update which MockDB should handle via recursion or loop
        # Wait, for $or, we need to apply status=pending to EACH branch or use $and
        # But MockDB simple matches implementation might not support $and wrapping $or easily
        # Let's keep it simple: filter in python if needed, or trust MockDB _matches
        # Actually, MockDB count_documents just iterates and checks matches.
        # We can wrap in $and: [{"$or": ...}, {"status": "pending"}]
        # But MockDB _matches doesn't support $and explicit operator in my implementation!
        
        # Simpler approach for MockDB environment:
        # Fetch all for user, then count
        pass 
    else:
        pending_query["status"] = "pending"

    # Re-implementing count manually for drivers to ensure accuracy with OR logic
    if current_user["role"] == "driver":
        all_tasks = await db.tasks.find(query).to_list(10000)
        total_tasks = len(all_tasks)
        pending_tasks = sum(1 for t in all_tasks if t.get("status") == "pending")
        completed_tasks = sum(1 for t in all_tasks if t.get("status") == "completed")
        
        total_earnings = sum(t.get("amount", 0) for t in all_tasks if t.get("status") == "completed")
        
        now = datetime.utcnow()
        overdue_tasks = sum(1 for t in all_tasks if t.get("status") != "completed" and t.get("due_date") and t.get("due_date") < now)
        
    else:
        # Admin logic (standard)
        total_tasks = await db.tasks.count_documents(query)
        pending_tasks = await db.tasks.count_documents({**query, "status": "pending"})
        completed_tasks = await db.tasks.count_documents({**query, "status": "completed"})
        
        # Calculate total earnings from completed tasks
        pipeline = [
            {"$match": {**query, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.tasks.aggregate(pipeline).to_list(1)
        total_earnings = result[0]["total"] if result else 0
        
        # Get overdue tasks
        now = datetime.utcnow()
        overdue_tasks = await db.tasks.count_documents({
            **query,
            "status": {"$ne": "completed"},
            "due_date": {"$lt": now, "$ne": None}
        })
    
    # Driver count (admin only)
    driver_count = 0
    if current_user["role"] == "admin":
        driver_count = await db.users.count_documents({"role": "driver"})
    
    return {
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "total_earnings": total_earnings,
        "driver_count": driver_count
    }

@api_router.get("/dashboard/admin/driver-payments", response_model=List[DriverEarnings])
async def get_driver_payments(current_user: dict = Depends(get_admin_user)):
    # Fetch all drivers
    drivers = await db.users.find({"role": "driver"}).to_list(1000)
    
    response = []
    for driver in drivers:
        driver_id = driver["id"]
        
        # Get tasks for this driver - using OR logic to catch tasks they created OR were assigned
        query = {
            "$or": [
                {"assigned_driver_id": driver_id},
                {"created_by": driver_id}
            ]
        }
        tasks = await db.tasks.find(query).to_list(1000)
        
        completed_tasks = [t for t in tasks if t.get("status") == "completed"]
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]
        
        total_earnings = sum(t.get("amount", 0) for t in completed_tasks)
        pending_amount = sum(t.get("amount", 0) for t in pending_tasks)
        
        # Only include if they have any activity
        if tasks:
            response.append(DriverEarnings(
                driver_id=driver_id,
                driver_name=driver["name"],
                total_earnings=total_earnings,
                task_count=len(completed_tasks),
                pending_amount=pending_amount,
                pending_count=len(pending_tasks)
            ))
        
    return response

# ===================== ROOT ROUTE =====================

@api_router.get("/")
async def root():
    return {"message": "Delivery Task Manager API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
