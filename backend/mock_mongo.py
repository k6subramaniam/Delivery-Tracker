import json
import os
from datetime import datetime

class MockCursor:
    # ... (same as before)
    def __init__(self, data):
        self.data = data
        self._skip = 0
        self._limit = None

    def sort(self, key, direction=1):
        reverse = direction == -1
        # Handle None values safely
        self.data.sort(key=lambda x: x.get(key) if x.get(key) is not None else "", reverse=reverse)
        return self
    
    def skip(self, skip):
        self._skip = skip
        return self
    
    def limit(self, limit):
        self._limit = limit
        return self

    async def to_list(self, length=None):
        if length is not None:
            self._limit = length
        
        start = self._skip
        end = start + self._limit if self._limit else None
        return self.data[start:end]

class MockCollection:
    def __init__(self, name, db):
        self.name = name
        self.db = db
        self.documents = []

    async def insert_one(self, doc):
        self.documents.append(doc)
        self.db._save()
        return True

    async def find_one(self, query):
        for doc in self.documents:
            if self._matches(doc, query):
                return doc
        return None
    
    def find(self, query=None):
        results = []
        if query is None:
            results = self.documents[:]
        else:
            for doc in self.documents:
                if self._matches(doc, query):
                    results.append(doc)
        return MockCursor(results)

    async def find_one_and_update(self, query, update, return_document=False):
        doc = await self.find_one(query)
        if doc:
            if "$set" in update:
                doc.update(update["$set"])
            self.db._save()
            return doc
        return None

    async def delete_one(self, query):
        doc = await self.find_one(query)
        if doc:
            self.documents.remove(doc)
            self.db._save()
            class Result:
                deleted_count = 1
            return Result()
        class Result:
            deleted_count = 0
        return Result()

    async def count_documents(self, query):
        count = 0
        for doc in self.documents:
            if self._matches(doc, query):
                count += 1
        return count
        
    async def update_one(self, query, update, upsert=False):
        doc = await self.find_one(query)
        if doc:
            if "$set" in update:
                doc.update(update["$set"])
            self.db._save()
        elif upsert:
             new_doc = query.copy()
             if "$set" in update:
                new_doc.update(update["$set"])
             self.documents.append(new_doc)
             self.db._save()
        return True

    async def aggregate(self, pipeline):
        # ... (same aggregate implementation as before)
        match_stage = next((s for s in pipeline if "$match" in s), None)
        group_stage = next((s for s in pipeline if "$group" in s), None)
        
        filtered = self.documents
        if match_stage:
            filtered = [d for d in self.documents if self._matches(d, match_stage["$match"])]
            
        if group_stage:
             group_config = group_stage["$group"]
             group_id = group_config.get("_id")
             
             if group_id is None:
                 # Group all into one
                 total = sum(d.get("amount", 0) for d in filtered)
                 return MockCursor([{"total": total}])
             elif isinstance(group_id, str) and group_id.startswith("$"):
                 # Group by field
                 field = group_id[1:]
                 groups = {}
                 for doc in filtered:
                     key = doc.get(field)
                     if key not in groups:
                         groups[key] = {"_id": key}
                         # Initialize accumulators
                         for k, v in group_config.items():
                             if k == "_id": continue
                             if isinstance(v, dict):
                                 if "$sum" in v:
                                     groups[key][k] = 0
                     
                     # Update accumulators
                     for k, v in group_config.items():
                         if k == "_id": continue
                         if isinstance(v, dict):
                             if "$sum" in v:
                                 val = v["$sum"]
                                 if val == 1:
                                     groups[key][k] += 1
                                 elif isinstance(val, str) and val.startswith("$"):
                                     groups[key][k] += doc.get(val[1:], 0)
                 
                 return MockCursor(list(groups.values()))
        
        return MockCursor([])

    def _matches(self, doc, query):
        if not query: return True
        for k, v in query.items():
            if k == "$or":
                match_found = False
                for sub_query in v:
                    if self._matches(doc, sub_query):
                        match_found = True
                        break
                if not match_found:
                    return False
                continue

            if isinstance(v, dict):
                 if "$ne" in v:
                     if doc.get(k) == v["$ne"]:
                         return False
                 if "$lt" in v:
                     if doc.get(k) is None or not (doc.get(k) < v["$lt"]):
                         return False
            elif doc.get(k) != v:
                return False
        return True

# Custom JSON Encoder for datetime
class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

def datetime_hook(json_dict):
    for (key, value) in json_dict.items():
        if isinstance(value, str):
            try:
                # Try to parse ISO format strings back to datetime
                if len(value) > 10 and value[10] == 'T':
                     json_dict[key] = datetime.fromisoformat(value)
            except (ValueError, IndexError):
                pass
    return json_dict

class MockDB:
    def __init__(self):
        self.file_path = "mock_db.json"
        self.collections = {
            "users": MockCollection("users", self),
            "tasks": MockCollection("tasks", self),
            "categories": MockCollection("categories", self),
            "priorities": MockCollection("priorities", self),
            "locations": MockCollection("locations", self)
        }
        self._load()
        
    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    data = json.load(f, object_hook=datetime_hook)
                    for name, docs in data.items():
                        if name in self.collections:
                            self.collections[name].documents = docs
            except Exception as e:
                print(f"Error loading mock db: {e}")

    def _save(self):
        try:
            data = {name: col.documents for name, col in self.collections.items()}
            with open(self.file_path, 'w') as f:
                json.dump(data, f, cls=DateTimeEncoder)
        except Exception as e:
            print(f"Error saving mock db: {e}")

    def __getattr__(self, name):
        if name in self.collections:
            return self.collections[name]
        raise AttributeError(f"Collection {name} not found")
        
    def __getitem__(self, name):
        return getattr(self, name)

# Singleton DB instance to ensure persistence across Client instantiations
_db_instance = MockDB()

class AsyncIOMotorClient:
    def __init__(self, url):
        self.db = _db_instance
    
    def __getitem__(self, name):
        return self.db
