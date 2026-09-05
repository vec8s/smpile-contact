"""
Connection Manager (مدير الاتصالات والمستخدمين)
-----------------------------------------------
هذا الملف مسؤول عن إدارة اتصالات WebSocket والمستخدمين في الذاكرة (In-Memory).
يقوم بربط اسم كل مستخدم (Username) مع كائن الاتصال الخاص به (WebSocket Connection).
"""

class ConnectionManager:
    def __init__(self):
        # قاموس لتخزين المستخدمين المتصلين: {username: websocket}
        self.active_connections = {}

    def add_user(self, username: str, websocket) -> bool:
        """
        إضافة مستخدم جديد إلى قائمة المتصلين.
        يرجع True إذا تمت الإضافة بنجاح، و False إذا كان الاسم مستخدماً بالفعل.
        """
        if not username or username.strip() == "":
            return False
        
        clean_name = username.strip()
        if clean_name in self.active_connections:
            return False
        
        self.active_connections[clean_name] = websocket
        return True

    def remove_user(self, username: str):
        """حذف مستخدم بالاسم عند تسجيل الخروج."""
        if username in self.active_connections:
            del self.active_connections[username]

    def remove_by_socket(self, websocket) -> str:
        """
        البحث عن المستخدم المرتبط بالـ socket وحذفه (مفيد عند انقطاع الاتصال المفاجئ).
        يرجع اسم المستخدم الذي تم حذفه أو None.
        """
        user_to_remove = None
        for username, socket in self.active_connections.items():
            if socket == websocket:
                user_to_remove = username
                break
        
        if user_to_remove:
            del self.active_connections[user_to_remove]
        return user_to_remove

    def get_online_users(self) -> list:
        """إرجاع قائمة بأسماء جميع المستخدمين المتصلين حالياً."""
        return list(self.active_connections.keys())

    def get_user_socket(self, username: str):
        """إرجاع اتصال الـ WebSocket الخاص بمستخدم معين لإرسال رسالة له."""
        return self.active_connections.get(username)

    def is_user_online(self, username: str) -> bool:
        """التحقق مما إذا كان المستخدم متصلاً."""
        return username in self.active_connections
