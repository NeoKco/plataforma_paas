from dataclasses import dataclass


@dataclass(frozen=True)
class ChatModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


CHAT_MODULE = ChatModuleDefinition(
    key="chat",
    name="Chat interno",
    route_prefix="/tenant/chat",
    tenant_portal_base_path="/tenant-portal/chat",
    description=(
        "Módulo tenant para conversaciones internas entre usuarios y hilos por contexto operativo."
    ),
)
