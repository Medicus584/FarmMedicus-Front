import {
  ShoppingCart,
  Package,
  Package2,
  TrendingUp,
  CreditCard,
  Bell,
  Users,
  LogOut,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
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
import { logout, getCurrentUser, changePassword } from "@/api/AuthApi";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

// Componente de diálogo para cambiar contraseña
function ChangePasswordDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(currentPassword, newPassword);
      
      if (result.success) {
        setSuccess(true);
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña se ha cambiado exitosamente",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || "Error al cambiar la contraseña");
      }
    } catch (err: any) {
      setError(err.message || "Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setIsLoading(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y la nueva contraseña que deseas establecer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Ingresa tu nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirma tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                ¡Contraseña cambiada exitosamente!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || success}>
              {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

  const handleSupportClick = () => {
    window.open("https://wa.me/59167461937", "_blank");
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

      <SidebarFooter className="p-4 flex-shrink-0 border-t border-[#D4AF37]/20 bg-[#F7F2E8] space-y-2">
        {/* Botón de Cambiar Contraseña */}
        <ChangePasswordDialog
          trigger={
            <Button
              variant="outline"
              size={collapsed ? "icon" : "default"}
              className={`${
                collapsed ? "w-full h-10" : "w-full"
              } border-[#4C5A2E] text-[#4C5A2E] hover:bg-[#4C5A2E] hover:text-[#F7F2E8] transition-colors`}
            >
              <KeyRound className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="ml-2">Cambiar Contraseña</span>}
            </Button>
          }
        />

        {/* Botón de soporte técnico */}
        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          onClick={handleSupportClick}
          className={`${
            collapsed ? "w-full h-10" : "w-full"
          } border-[#4C5A2E] text-[#4C5A2E] hover:bg-[#4C5A2E] hover:text-[#F7F2E8] transition-colors`}
        >
          <Phone className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Contactar Soporte</span>}
        </Button>

        {/* Botón de cerrar sesión */}
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