from fastapi import Request, HTTPException, Depends
from .firebase_config import verify_token, get_firestore_client
from .models import UserRole

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    decoded_token = verify_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return decoded_token

def role_required(allowed_roles: list[UserRole]):
    async def decorator(current_user: dict = Depends(get_current_user)):
        uid = current_user.get("uid")
        db = get_firestore_client()
        user_doc = db.collection("users").document(uid).get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=403, detail="User profile not found")
        
        user_data = user_doc.to_dict()
        user_role = user_data.get("role")
        
        if user_role not in [role.value for role in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        return user_data
    return decorator
