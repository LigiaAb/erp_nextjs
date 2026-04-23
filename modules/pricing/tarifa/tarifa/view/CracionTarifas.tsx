"use client";

import React from "react";
import TarifaFormulario from "../components/tarifaFormulario";
import { DrawerContent, DrawerTrigger, Drawer } from "@/components/ui/drawer";
import { EditableTable } from "@/components/custom/Table";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";

const obligatoriosInsertar = [
  "empresa",
  "centroCosto",
  "rubro",
  "proveedor",
  "servicio",
  "tipoTransporte",
  "tipoServicio",
  "tipoCarga",
  "clasificacioncarga",
  "tipoPago",
  "",
];

const gruposDeFiltro = ["alcance", "vigencia"];

const camposDeFiltro = [
  "usuario",
  "nombre",
  "siglas",
  "obligatorio",
  "incoterm",
  "metodoCalculo",
  "aplicaOrigenesDestinos",
  "aplicaCommodities",
  "tipoTarifa",
  "fechaInicio",
  "fechaFin",
  "fechaCreacion",
  "fechaModificacion",
  "usuario",
];

const CracionTarifas = () => {
  const [openFiltro, setOpenFiltro] = React.useState(false);

  return (
    <div className="py-5">
      <EditableTable
        columns={[]}
        data={[]}
        getRowId={(r) => ""}
        metadata={{ module: "Pricing" }}
        headerActions={
          <>
            <Button variant="outline">Exportar</Button>
            <Button variant="outline">Sincronizar</Button>

            <Drawer direction="right" modal={false} open={openFiltro} onOpenChange={setOpenFiltro}>
              <DrawerTrigger asChild>
                <Button variant="outline">Filtrar</Button>
              </DrawerTrigger>

              {openFiltro && (
                <button type="button" aria-label="Cerrar filtro" className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpenFiltro(false)} />
              )}

              <DrawerContent className="pointer-events-auto z-50 py-5" onClick={(e) => e.stopPropagation()}>
                <DialogTitle className="px-5">Filtrar por:</DialogTitle>
                <TarifaFormulario tipoFormulario="filtro" inputsToHide={camposDeFiltro} groupsToHide={gruposDeFiltro} />
              </DrawerContent>
            </Drawer>
          </>
        }
      />

      <TarifaFormulario tipoFormulario="ingreso" obligatorios={obligatoriosInsertar} />
    </div>
  );
};

export default CracionTarifas;
