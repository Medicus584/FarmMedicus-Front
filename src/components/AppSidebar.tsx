import {
  ShoppingCart,
  Package,
  Package2,
  TrendingUp,
  CreditCard,
  Bell,
  Users,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardView } from "@/pages/Dashboard";
import { logout, getCurrentUser } from "@/api/AuthApi";
import { useEffect } from "react";

interface AppSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  {
    title: "Vender",
    url: "vender",
    icon: ShoppingCart,
    roles: ["admin", "asistente"],
  },
  {
    title: "Productos",
    url: "productos",
    icon: Package,
    roles: ["admin", "asistente"],
  },
  {
    title: "Inventario",
    url: "inventario",
    icon: Package2,
    roles: ["admin"],
  },
  {
    title: "Ventas",
    url: "ventas",
    icon: TrendingUp,
    roles: ["admin", "asistente"],
  },
  {
    title: "Caja",
    url: "caja",
    icon: CreditCard,
    roles: ["admin"],
  },
  {
    title: "Registra Movimiento",
    url: "registra-movimiento",
    icon: CreditCard,
    roles: ["admin", "asistente"],
  },
  {
    title: "Alertas",
    url: "alertas",
    icon: Bell,
    roles: ["admin"],
  },
  {
    title: "Gestión de Usuarios",
    url: "usuarios",
    icon: Users,
    roles: ["admin"],
  },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = getCurrentUser();
  const userRole = user?.rol.toLowerCase() || "admin";

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    try {
      await logout();

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });

      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });

      navigate("/login");
    }
  };

  const isActive = (view: string) => currentView === view;

  const handleMenuItemClick = (view: DashboardView) => {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      setOpenMobile(false);
    }

    onViewChange(view);
  };

  useEffect(() => {
    const handleRouteChange = () => {
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        setOpenMobile(false);
      }
    };

    handleRouteChange();
  }, [currentView, setOpenMobile]);

  return (
    <Sidebar
      collapsible="icon"
      className="h-screen overflow-hidden bg-[#F7F2E8] border-r border-[#D4AF37]/20"
    >
      <SidebarHeader className="p-4 flex-shrink-0 border-b border-[#D4AF37]/20 bg-[#F7F2E8]">
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          }`}
        >
          {collapsed ? (
            <img
              src="/lovable-uploads/image.png"
              alt="NEOLED Logo"
              className="h-12 w-12 object-contain transition-all"
            />
          ) : (
            <img
              src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png"
              alt="NEOLED Logo"
              className="h-auto w-auto transition-all"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F2E8] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() =>
                      handleMenuItemClick(item.url as DashboardView)
                    }
                    className={
                      isActive(item.url)
                        ? "bg-[#4C5A2E] text-[#F7F2E8] hover:bg-[#4C5A2E]/90"
                        : "text-[#2F381F] hover:bg-[#D4AF37]/20 hover:text-[#2F381F]"
                    }
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 flex-shrink-0 border-t border-[#D4AF37]/20 bg-[#F7F2E8]">
        <Button
          variant="secondary"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={`${
            collapsed ? "w-full h-10" : "w-full"
          } bg-[#4C5A2E] text-[#F7F2E8] hover:bg-[#2F381F] hover:text-[#F7F2E8] transition-colors`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}