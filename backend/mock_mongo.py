import asyncio
from datetime import datetime

class MockCursor:
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
    def __init__(self):
        self.documents = []

    async def insert_one(self, doc):
        self.documents.append(doc)
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
            return doc
        return None

    async def delete_one(self, query):
        doc = await self.find_one(query)
        if doc:
            self.documents.remove(doc)
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
        elif upsert:
             new_doc = query.copy()
             if "$set" in update:
                new_doc.update(update["$set"])
             self.documents.append(new_doc)
        return True

    async def aggregate(self, pipeline):
        match_stage = next((s for s in pipeline if "$match" in s), None)
        group_stage = next((s for s in pipeline if "$group" in s), None)
        
        filtered = self.documents
        if match_stage:
            filtered = [d for d in self.documents if self._matches(d, match_stage["$match"])]
            
        if group_stage:
             total = sum(d.get("amount", 0) for d in filtered)
             return MockCursor([{"total": total}])
        
        return MockCursor([])

    def _matches(self, doc, query):
        if not query: return True
        for k, v in query.items():
            if isinstance(v, dict):
                 if "$ne" in v:
                     if doc.get(k) == v["$ne"]:
                         return False
                     # If the field is missing and we check != None, it's effectively match if None != val
                     # But $ne: None checks if it IS NOT None.
                 if "$lt" in v:
                     if doc.get(k) is None or not (doc.get(k) < v["$lt"]):
                         return False
            elif doc.get(k) != v:
                return False
        return True

class MockDB:
    def __init__(self):
        self.users = MockCollection()
        self.tasks = MockCollection()
        self.categories = MockCollection()
        self.priorities = MockCollection()
        self.locations = MockCollection()
        
    def __getitem__(self, name):
        return getattr(self, name)

class AsyncIOMotorClient:
    def __init__(self, url):
        self.db = MockDB()
    
    def __getitem__(self, name):
        return self.db
