#!/usr/bin/env python3
"""
Backend API Testing for Delivery Task Manager
Tests all backend endpoints with proper authentication and realistic data
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://tasktrail-10.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password123"

class DeliveryTaskManagerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.driver_token = None
        self.test_data = {}
        self.failed_tests = []
        self.passed_tests = []
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test results"""
        if success:
            self.passed_tests.append(test_name)
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.failed_tests.append(test_name)
            print(f"❌ {test_name}: FAILED {message}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
            
            return response, None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test 1: Login with existing admin
        print("\n1. Testing admin login...")
        response, error = self.make_request("POST", "/auth/login", {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if error:
            self.log_result("Admin Login", False, error)
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.admin_token = data["access_token"]
                self.log_result("Admin Login", True, f"Token received, user role: {data['user']['role']}")
            else:
                self.log_result("Admin Login", False, "Missing token or user data in response")
                return False
        else:
            self.log_result("Admin Login", False, f"Status {response.status_code}: {response.text}")
            return False
        
        # Test 2: Register new driver
        print("\n2. Testing driver registration...")
        driver_email = f"driver_{datetime.now().strftime('%Y%m%d_%H%M%S')}@delivery.com"
        response, error = self.make_request("POST", "/auth/register", {
            "email": driver_email,
            "password": "driver123",
            "name": "John Driver",
            "role": "driver"
        })
        
        if error:
            self.log_result("Driver Registration", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.driver_token = data["access_token"]
                self.test_data["driver_id"] = data["user"]["id"]
                self.test_data["driver_email"] = driver_email
                self.log_result("Driver Registration", True, f"Driver registered: {data['user']['name']}")
            else:
                self.log_result("Driver Registration", False, "Missing token in response")
        else:
            self.log_result("Driver Registration", False, f"Status {response.status_code}: {response.text}")
        
        # Test 3: Get current user info
        print("\n3. Testing get current user...")
        response, error = self.make_request("GET", "/auth/me", token=self.admin_token)
        
        if error:
            self.log_result("Get Current User", False, error)
        elif response.status_code == 200:
            data = response.json()
            if data.get("email") == ADMIN_EMAIL:
                self.log_result("Get Current User", True, f"User info retrieved: {data['name']}")
            else:
                self.log_result("Get Current User", False, "Incorrect user data returned")
        else:
            self.log_result("Get Current User", False, f"Status {response.status_code}: {response.text}")
        
        return self.admin_token is not None
    
    def test_categories_endpoints(self):
        """Test categories CRUD operations"""
        print("\n=== Testing Categories Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Categories Test", False, "No admin token available")
            return
        
        # Test 1: Create category
        print("\n1. Testing create category...")
        response, error = self.make_request("POST", "/categories", {
            "name": "Food Delivery",
            "color": "#FF6B35"
        }, self.admin_token)
        
        if error:
            self.log_result("Create Category", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            self.test_data["category_id"] = data["id"]
            self.log_result("Create Category", True, f"Category created: {data['name']}")
        else:
            self.log_result("Create Category", False, f"Status {response.status_code}: {response.text}")
            return
        
        # Test 2: Get all categories
        print("\n2. Testing get categories...")
        response, error = self.make_request("GET", "/categories", token=self.admin_token)
        
        if error:
            self.log_result("Get Categories", False, error)
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("Get Categories", True, f"Retrieved {len(data)} categories")
            else:
                self.log_result("Get Categories", False, "No categories returned")
        else:
            self.log_result("Get Categories", False, f"Status {response.status_code}: {response.text}")
        
        # Test 3: Update category
        print("\n3. Testing update category...")
        if "category_id" in self.test_data:
            response, error = self.make_request("PUT", f"/categories/{self.test_data['category_id']}", {
                "name": "Express Food Delivery",
                "color": "#FF4500"
            }, self.admin_token)
            
            if error:
                self.log_result("Update Category", False, error)
            elif response.status_code == 200:
                data = response.json()
                self.log_result("Update Category", True, f"Category updated: {data['name']}")
            else:
                self.log_result("Update Category", False, f"Status {response.status_code}: {response.text}")
    
    def test_priorities_endpoints(self):
        """Test priorities CRUD operations"""
        print("\n=== Testing Priorities Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Priorities Test", False, "No admin token available")
            return
        
        # Test 1: Create priority
        print("\n1. Testing create priority...")
        response, error = self.make_request("POST", "/priorities", {
            "name": "Urgent",
            "level": 5,
            "color": "#DC2626"
        }, self.admin_token)
        
        if error:
            self.log_result("Create Priority", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            self.test_data["priority_id"] = data["id"]
            self.log_result("Create Priority", True, f"Priority created: {data['name']} (Level {data['level']})")
        else:
            self.log_result("Create Priority", False, f"Status {response.status_code}: {response.text}")
            return
        
        # Test 2: Get all priorities
        print("\n2. Testing get priorities...")
        response, error = self.make_request("GET", "/priorities", token=self.admin_token)
        
        if error:
            self.log_result("Get Priorities", False, error)
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("Get Priorities", True, f"Retrieved {len(data)} priorities")
            else:
                self.log_result("Get Priorities", False, "No priorities returned")
        else:
            self.log_result("Get Priorities", False, f"Status {response.status_code}: {response.text}")
        
        # Test 3: Update priority
        print("\n3. Testing update priority...")
        if "priority_id" in self.test_data:
            response, error = self.make_request("PUT", f"/priorities/{self.test_data['priority_id']}", {
                "name": "Critical",
                "level": 5,
                "color": "#B91C1C"
            }, self.admin_token)
            
            if error:
                self.log_result("Update Priority", False, error)
            elif response.status_code == 200:
                data = response.json()
                self.log_result("Update Priority", True, f"Priority updated: {data['name']}")
            else:
                self.log_result("Update Priority", False, f"Status {response.status_code}: {response.text}")
    
    def test_tasks_endpoints(self):
        """Test tasks CRUD operations"""
        print("\n=== Testing Tasks Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Tasks Test", False, "No admin token available")
            return
        
        # Test 1: Create task
        print("\n1. Testing create task...")
        due_date = (datetime.now() + timedelta(days=2)).isoformat()
        task_data = {
            "title": "Deliver Pizza to Downtown Office",
            "description": "Large pizza order for office meeting - handle with care",
            "amount": 45.50,
            "due_date": due_date
        }
        
        # Add category and priority if available
        if "category_id" in self.test_data:
            task_data["category_id"] = self.test_data["category_id"]
        if "priority_id" in self.test_data:
            task_data["priority_id"] = self.test_data["priority_id"]
        if "driver_id" in self.test_data:
            task_data["assigned_driver_id"] = self.test_data["driver_id"]
        
        response, error = self.make_request("POST", "/tasks", task_data, self.admin_token)
        
        if error:
            self.log_result("Create Task", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            self.test_data["task_id"] = data["id"]
            self.log_result("Create Task", True, f"Task created: {data['title']} (${data['amount']})")
        else:
            self.log_result("Create Task", False, f"Status {response.status_code}: {response.text}")
            return
        
        # Test 2: Get all tasks
        print("\n2. Testing get all tasks...")
        response, error = self.make_request("GET", "/tasks", token=self.admin_token)
        
        if error:
            self.log_result("Get All Tasks", False, error)
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get All Tasks", True, f"Retrieved {len(data)} tasks")
            else:
                self.log_result("Get All Tasks", False, "Invalid response format")
        else:
            self.log_result("Get All Tasks", False, f"Status {response.status_code}: {response.text}")
        
        # Test 3: Get single task
        print("\n3. Testing get single task...")
        if "task_id" in self.test_data:
            response, error = self.make_request("GET", f"/tasks/{self.test_data['task_id']}", token=self.admin_token)
            
            if error:
                self.log_result("Get Single Task", False, error)
            elif response.status_code == 200:
                data = response.json()
                self.log_result("Get Single Task", True, f"Task retrieved: {data['title']}")
            else:
                self.log_result("Get Single Task", False, f"Status {response.status_code}: {response.text}")
        
        # Test 4: Update task
        print("\n4. Testing update task...")
        if "task_id" in self.test_data:
            response, error = self.make_request("PUT", f"/tasks/{self.test_data['task_id']}", {
                "title": "Deliver Pizza to Downtown Office - UPDATED",
                "amount": 50.00,
                "status": "in-progress"
            }, self.admin_token)
            
            if error:
                self.log_result("Update Task", False, error)
            elif response.status_code == 200:
                data = response.json()
                self.log_result("Update Task", True, f"Task updated: {data['title']} (${data['amount']})")
            else:
                self.log_result("Update Task", False, f"Status {response.status_code}: {response.text}")
        
        # Test 5: Complete task
        print("\n5. Testing complete task...")
        if "task_id" in self.test_data:
            response, error = self.make_request("PUT", f"/tasks/{self.test_data['task_id']}/complete", token=self.admin_token)
            
            if error:
                self.log_result("Complete Task", False, error)
            elif response.status_code == 200:
                data = response.json()
                self.log_result("Complete Task", True, f"Task completed: {data['status']}")
            else:
                self.log_result("Complete Task", False, f"Status {response.status_code}: {response.text}")
    
    def test_location_endpoints(self):
        """Test location tracking endpoints"""
        print("\n=== Testing Location Endpoints ===")
        
        if not self.driver_token:
            self.log_result("Location Test", False, "No driver token available")
            return
        
        # Test 1: Update driver location
        print("\n1. Testing update driver location...")
        response, error = self.make_request("POST", "/location/update", {
            "latitude": 40.7128,
            "longitude": -74.0060
        }, self.driver_token)
        
        if error:
            self.log_result("Update Location", False, error)
        elif response.status_code == 200:
            self.log_result("Update Location", True, "Driver location updated successfully")
        else:
            self.log_result("Update Location", False, f"Status {response.status_code}: {response.text}")
        
        # Test 2: Get all driver locations (admin only)
        print("\n2. Testing get all driver locations...")
        if self.admin_token:
            response, error = self.make_request("GET", "/drivers/locations", token=self.admin_token)
            
            if error:
                self.log_result("Get Driver Locations", False, error)
            elif response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Driver Locations", True, f"Retrieved {len(data)} driver locations")
                else:
                    self.log_result("Get Driver Locations", False, "Invalid response format")
            else:
                self.log_result("Get Driver Locations", False, f"Status {response.status_code}: {response.text}")
    
    def test_dashboard_endpoints(self):
        """Test dashboard statistics"""
        print("\n=== Testing Dashboard Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Dashboard Test", False, "No admin token available")
            return
        
        # Test dashboard stats
        print("\n1. Testing dashboard stats...")
        response, error = self.make_request("GET", "/dashboard/stats", token=self.admin_token)
        
        if error:
            self.log_result("Dashboard Stats", False, error)
        elif response.status_code == 200:
            data = response.json()
            required_fields = ["total_tasks", "pending_tasks", "completed_tasks", "total_earnings"]
            if all(field in data for field in required_fields):
                self.log_result("Dashboard Stats", True, f"Stats retrieved - Total tasks: {data['total_tasks']}, Earnings: ${data['total_earnings']}")
            else:
                self.log_result("Dashboard Stats", False, f"Missing required fields in response: {data}")
        else:
            self.log_result("Dashboard Stats", False, f"Status {response.status_code}: {response.text}")
    
    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n=== Testing Role-Based Access Control ===")
        
        if not self.driver_token:
            self.log_result("Role Access Test", False, "No driver token available")
            return
        
        # Test driver trying to access admin-only endpoint
        print("\n1. Testing driver access to admin endpoint...")
        response, error = self.make_request("GET", "/drivers/locations", token=self.driver_token)
        
        if error:
            self.log_result("Driver Admin Access", False, error)
        elif response.status_code == 403:
            self.log_result("Driver Admin Access", True, "Driver correctly denied admin access")
        elif response.status_code == 401:
            self.log_result("Driver Admin Access", True, "Driver correctly denied admin access (401)")
        else:
            self.log_result("Driver Admin Access", False, f"Driver should not have admin access - Status {response.status_code}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        if not self.admin_token:
            return
        
        # Delete test task
        if "task_id" in self.test_data:
            response, error = self.make_request("DELETE", f"/tasks/{self.test_data['task_id']}", token=self.admin_token)
            if response and response.status_code == 200:
                print("✅ Test task deleted")
            else:
                print("❌ Failed to delete test task")
        
        # Delete test category
        if "category_id" in self.test_data:
            response, error = self.make_request("DELETE", f"/categories/{self.test_data['category_id']}", token=self.admin_token)
            if response and response.status_code == 200:
                print("✅ Test category deleted")
            else:
                print("❌ Failed to delete test category")
        
        # Delete test priority
        if "priority_id" in self.test_data:
            response, error = self.make_request("DELETE", f"/priorities/{self.test_data['priority_id']}", token=self.admin_token)
            if response and response.status_code == 200:
                print("✅ Test priority deleted")
            else:
                print("❌ Failed to delete test priority")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Delivery Task Manager Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Run tests in order
        auth_success = self.test_auth_endpoints()
        if auth_success:
            self.test_categories_endpoints()
            self.test_priorities_endpoints()
            self.test_tasks_endpoints()
            self.test_location_endpoints()
            self.test_dashboard_endpoints()
            self.test_role_based_access()
            self.cleanup_test_data()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed: {len(self.passed_tests)}")
        print(f"❌ Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests: {len(self.passed_tests)} total")
        
        print(f"\n🎯 Success Rate: {len(self.passed_tests)/(len(self.passed_tests) + len(self.failed_tests))*100:.1f}%")
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = DeliveryTaskManagerTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()