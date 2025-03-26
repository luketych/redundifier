# Debugging Strategy

## 1. Test GET Requests First
- [ ] Test GET /api/atoms
- [ ] Test GET /api/upload

## 2. Already Tried (Not Working)
1. Using node-fetch FormData
2. Using form-data-encoder
3. Using got with FormData
4. Using native http/https module
5. Using direct stream piping

## 3. Next Steps
1. Test basic GET endpoints to ensure routing is working
2. If GET works, isolate if issue is with:
   - Route handling
   - FormData processing
   - Docker host resolution
   - Headers handling

## 4. Test Commands
```bash
# Test atoms endpoint
curl -v http://localhost:1336/api/atoms

# Test upload endpoint
curl -v http://localhost:1336/api/upload

# If those work, then test POST
curl -X POST -F "files=@test.txt" -v http://localhost:1336/api/upload
