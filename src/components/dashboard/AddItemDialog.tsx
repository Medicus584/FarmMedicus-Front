// components/AddItemDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemType: string;
  initialValue?: string;
  onAdd: (name: string) => Promise<void> | void;
  isEditing?: boolean;
}

export function AddItemDialog({
  open,
  onOpenChange,
  title,
  itemType,
  initialValue = "",
  onAdd,
  isEditing = false,
}: AddItemDialogProps) {
  const [formName, setFormName] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Resetear el nombre cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setFormName(initialValue);
    }
  }, [open, initialValue]);

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "El nombre no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formName.trim());
      
      toast({
        title: isEditing ? "Actualizado exitosamente" : "Agregado exitosamente",
        description: `${formName.trim()} ha sido ${isEditing ? "actualizado" : "agregado"} a ${itemType}`,
      });

      setFormName("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? "actualizar" : "agregar"} el elemento`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setFormName("");
    onOpenChange(false);
  };

  // Manejar la tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (formName.trim()) {
        handleSubmit();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="item-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ingresa el nombre del ${itemType}`}
              className="h-9 text-sm"
              autoFocus
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="h-9"
          >
            Cancelar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 h-9"
                disabled={!formName.trim() || isSubmitting}
              >
                {isSubmitting ? "Guardando..." : isEditing ? "Guardar" : "Agregar"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de {isEditing ? "actualizar" : "agregar"} "{formName}" a {itemType}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Procesando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}