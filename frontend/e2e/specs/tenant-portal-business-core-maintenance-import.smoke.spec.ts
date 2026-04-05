import { expect, test, type Locator, type Page } from "../support/test";
import { loginTenant } from "../support/auth";

async function openTenantImportedPage(page: Page, path: string, heading: RegExp) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}($|[/?#])`));
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

function getCatalogRow(page: Page, text: string | RegExp) {
  return page.locator("tbody tr").filter({ hasText: text }).first();
}

function getFieldControl(container: Locator, label: RegExp) {
  return container
    .locator("div")
    .filter({ hasText: label })
    .locator("input, select, textarea, [role='combobox']")
    .first();
}

async function openBusinessCoreWorkGroupMembers(page: Page) {
  await page.getByRole("button", { name: /Miembros|Members/i }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Miembros del grupo|Group members/i })).toBeVisible();
}

test("tenant portal shows imported business core and maintenance data from ieris_app", async ({
  page,
}) => {
  await loginTenant(page);

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/organizations",
    /Empresas y contrapartes|Organizations and counterparts/i
  );
  await expect(getCatalogRow(page, /Ieris Ltda/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/clients",
    /^Clientes$|^Clients$/i
  );
  await expect(getCatalogRow(page, /Cecilia Tabales/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core",
    /Base compartida tenant|Shared tenant base/i
  );
  await expect(page.getByRole("button", { name: /Abrir duplicados|Open duplicates/i })).toBeVisible();
  await expect(page.getByText(/\/tenant-portal\/business-core\/duplicates/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/duplicates",
    /Depuración de duplicados|Duplicate cleanup/i
  );
  await expect(page.getByRole("link", { name: /Duplicados|Duplicates/i })).toBeVisible();
  await expect(page.getByText(/Auditoría de duplicados|Duplicate audit/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Clientes duplicados|Duplicate clients/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Direcciones duplicadas|Duplicate addresses/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Instalaciones duplicadas|Duplicate installations/i })).toBeVisible();
  await expect(
    page.getByText(/sugerida para conservar por grupo|suggested record to keep per group/i)
  ).toBeVisible();
  await expect(page.getByText(/fichas origen|source records|OT a mover|work orders to move/i).first()).toBeVisible();
  await expect(page.getByText(/consolidarla hacia la sugerida|consolidate it into the suggested one/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Recargar|Reload/i })).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/work-groups",
    /Grupos de trabajo|Work groups/i
  );
  await expect(getCatalogRow(page, /lider|mantenciones|sst/i)).toBeVisible();
  await openBusinessCoreWorkGroupMembers(page);

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance",
    /Resumen t[eé]cnico|Technical overview/i
  );
  await expect(page.getByText(/Últimas 5 mantenciones realizadas|Last 5 completed maintenance/i)).toBeVisible();
  await expect(
    page.getByText(/Sincronización automática a finanzas|Automatic finance sync/i)
  ).toBeVisible();
  await expect(
    page
      .locator("div")
      .filter({ hasText: /Modo de sincronización|Sync mode/i })
      .locator("select, [role='combobox']")
      .first()
  ).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/work-orders",
    /Mantenciones abiertas|Open maintenance work/i
  );
  const newWorkOrderButton = page.getByRole("button", {
    name: /Nueva mantenci[oó]n|Nueva orden|New work order/i,
  });
  await expect(newWorkOrderButton).toBeVisible();
  if (await newWorkOrderButton.isEnabled()) {
    await newWorkOrderButton.click();
    const workOrderDialog = page.getByRole("dialog", {
      name: /Nueva mantención|New maintenance work/i,
    });
    await expect(workOrderDialog).toBeVisible();
    await expect(
      workOrderDialog
        .locator("div")
        .filter({ hasText: /Grupo responsable|Responsible group/i })
        .locator("select")
        .first()
    ).toBeVisible();
    await expect(
      workOrderDialog
        .locator("div")
        .filter({ hasText: /Técnico responsable|Assigned technician/i })
        .locator("select")
        .first()
    ).toBeVisible();
    await page.getByRole("button", { name: /Cancelar|Cancel/i }).click();
  }
  const openWorkOrderRows = page.locator("tbody tr");
  if ((await openWorkOrderRows.count()) > 0) {
    await expect(getCatalogRow(page, /mantenci[oó]n|visita/i)).toBeVisible();
    await page.getByRole("button", { name: /Costos|Costing/i }).first().click();
    const costingDialog = page.getByRole("dialog", {
      name: /Costos y cobro de mantención|Maintenance costing and billing/i,
    });
    await expect(costingDialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /Costos y cobro|Costing and billing/i })).toBeVisible();
    await expect(
      costingDialog
        .locator("div")
        .filter({ hasText: /Costo estimado total|Estimated total cost/i })
        .locator("input")
        .first()
    ).toBeVisible();
    await expect(
      costingDialog
        .locator("div")
        .filter({ hasText: /Monto cobrado|Amount charged/i })
        .locator("input")
        .first()
    ).toBeVisible();
    await expect(costingDialog.getByRole("button", { name: /Agregar línea|Add line/i }).first()).toBeVisible();
    await expect(costingDialog.getByLabel(/Sincronizar ingreso|Sync income/i)).toBeVisible();
    await expect(costingDialog.getByRole("button", { name: /Cerrar|Close/i })).toBeVisible();
    await costingDialog.getByRole("button", { name: /Cerrar|Close/i }).click();
    await page.getByRole("button", { name: /Checklist/i }).first().click();
    const fieldReportDialog = page.getByRole("dialog", {
      name: /Checklist y evidencias de mantención|Maintenance checklist and evidence/i,
    });
    await expect(fieldReportDialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /Checklist y evidencias|Checklist and evidence/i })).toBeVisible();
    await expect(fieldReportDialog.getByText(/Acciones rápidas en terreno|Field quick actions/i)).toBeVisible();
    await expect(page.getByText(/Avance checklist|Checklist progress/i)).toBeVisible();
    await expect(fieldReportDialog.getByRole("heading", { name: /Checklist técnico|Technical checklist/i })).toBeVisible();
    await expect(fieldReportDialog.getByRole("heading", { name: /^Evidencias$|^Evidence$/i })).toBeVisible();
    await expect(fieldReportDialog.locator("textarea").first()).toBeVisible();
    await expect(fieldReportDialog.getByRole("button", { name: /Guardar checklist|Save checklist/i })).toBeVisible();
    await fieldReportDialog.getByRole("button", { name: /Cerrar|Close/i }).click();
    await page.getByRole("button", { name: /Ver ficha|Open detail/i }).first().click();
    const workOrderDetailDialog = page.getByRole("dialog", {
      name: /Ficha de mantención|Maintenance detail/i,
    });
    await expect(workOrderDetailDialog).toBeVisible();
    await expect(workOrderDetailDialog.locator(".panel-card__title").filter({ hasText: /Ficha de mantención|Maintenance detail/i }).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByText(/Instalación|Installation/i).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByText(/Tipo de tarea|Task type/i).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByText(/Perfil funcional|Function profile/i).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByText(/Cambios y eventos|Changes and events/i).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByText(/Visitas asociadas|Linked visits/i).first()).toBeVisible();
    await expect(workOrderDetailDialog.getByRole("button", { name: /Visitas|Visits/i })).toBeVisible();
    await workOrderDetailDialog.getByRole("button", { name: /Cerrar|Close/i }).click();
    await page.getByRole("button", { name: /Visitas|Visits/i }).first().click();
    const visitsDialog = page.getByRole("dialog", {
      name: /Visitas de mantención|Maintenance visits/i,
    });
    await expect(visitsDialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /Visitas de mantención|Maintenance visits/i })).toBeVisible();
    await expect(visitsDialog.getByText(/Coordinación operativa|Operational coordination/i)).toBeVisible();
    await expect(visitsDialog.getByText(/Secuencia de terreno|Field sequence/i)).toBeVisible();
    await expect(visitsDialog.getByRole("button", { name: /Nueva visita|New visit/i })).toBeVisible();
    const followUpButtons = visitsDialog.getByRole("button", { name: /Crear seguimiento|Create follow-up/i });
    if ((await followUpButtons.count()) > 0) {
      await expect(followUpButtons.first()).toBeVisible();
    }
    const editVisitButtons = visitsDialog.getByRole("button", { name: /Editar|Edit/i });
    if ((await editVisitButtons.count()) > 0) {
      await editVisitButtons.first().click();
      await expect(visitsDialog.getByText(/Alinear siguientes visitas|Align following visits/i)).toBeVisible();
      await visitsDialog.getByRole("button", { name: /Cancelar|Cancel/i }).click();
    }
    await visitsDialog.getByRole("button", { name: /Nueva visita|New visit/i }).click();
    await expect(visitsDialog.getByText(/Atajos de coordinación|Coordination shortcuts/i)).toBeVisible();
    await expect(visitsDialog.getByRole("button", { name: /Usar ventana OT|Use work order window/i })).toBeVisible();
    await expect(getFieldControl(visitsDialog, /Inicio programado|Scheduled start/i)).toBeVisible();
    await expect(getFieldControl(visitsDialog, /Fin programado|Scheduled end/i)).toBeVisible();
    await expect(getFieldControl(visitsDialog, /Técnico responsable|Assigned technician/i)).toBeVisible();
    await visitsDialog.getByRole("button", { name: /Cancelar|Cancel/i }).click();
    await visitsDialog.getByRole("button", { name: /Cerrar|Close/i }).click();
    await page.getByRole("button", { name: /Reprogramar|Reschedule/i }).first().click();
    const rescheduleDialog = page.getByRole("dialog", {
      name: /Reprogramar mantención|Edit maintenance work/i,
    });
    await expect(rescheduleDialog).toBeVisible();
    await expect(page.getByText(/Reprogramación auditada|Targeted edit/i)).toBeVisible();
    await expect(rescheduleDialog.getByLabel(/Motivo de reprogramación|Reschedule reason/i)).toBeVisible();
    await expect(rescheduleDialog.getByText(/Ventana a sincronizar|Window to sync/i)).toBeVisible();
    await rescheduleDialog.getByRole("button", { name: /Cancelar|Cancel/i }).click();
  }

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/due-items",
    /Pendientes|Due maintenance/i
  );
  await page.getByRole("button", { name: /Nueva programación|New schedule/i }).click();
  const planDialog = page
    .locator(".maintenance-form-modal")
    .filter({ has: page.getByRole("heading", { name: /Nueva programación|New schedule/i }) })
    .first();
  await expect(page.getByRole("heading", { name: /Nueva programación|New schedule/i })).toBeVisible();
  await expect(planDialog).toBeVisible();
  await expect(getFieldControl(planDialog, /Cliente|Client/i)).toBeVisible();
  await expect(getFieldControl(planDialog, /Próxima mantención|Next due/i)).toBeVisible();
  await expect(getFieldControl(planDialog, /Frecuencia|Frequency/i)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Plantillas de costeo de mantención|Maintenance costing templates/i,
    })
  ).toBeVisible();
  await expect(getFieldControl(planDialog, /Aplicar plantilla existente|Apply existing template/i)).toBeVisible();
  await expect(planDialog.getByRole("button", { name: /Guardar como plantilla|Save as template/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Costeo estimado por defecto|Default estimated costing/i })).toBeVisible();
  await expect(getFieldControl(planDialog, /Margen objetivo|Target margin/i)).toBeVisible();
  await expect(
    page.getByText(
      /Si existe una mantención cerrada este año en historial|Sugerida desde historial cerrado|No se encontró una mantención cerrada este año|Buscando historial técnico para sugerir la próxima mantención|Se propone frecuencia anual|If a closed maintenance exists this year in history|Suggested from closed history|No closed maintenance was found for this year|Checking technical history to suggest the next maintenance date|Annual frequency is suggested/i
    )
  ).toBeVisible();
  await expect(getFieldControl(planDialog, /Duración estimada|Estimated duration/i)).toBeVisible();
  await expect(planDialog.getByRole("button", { name: /Agregar línea|Add line/i })).toBeVisible();
  await planDialog.getByRole("button", { name: /Cancelar|Cancel/i }).click();
  await expect(
    page.getByRole("heading", { name: /Agrupación por organización|Organization grouping/i })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Instalaciones activas sin plan preventivo|Active installations without preventive plan/i })
  ).toBeVisible();
  const dueRows = page.locator("tbody tr");
  if ((await dueRows.count()) > 0) {
    const firstDueRow = dueRows.first();
    await expect(firstDueRow.getByRole("link", { name: /Ver cliente|Open client/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Contactar|Contact/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Posponer|Postpone/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Agendar|Schedule/i })).toBeVisible();
  }

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/installations",
    /Instalaciones|Installations/i
  );
  await expect(getCatalogRow(page, /heat pipe/i)).toBeVisible();
  await page.getByRole("button", { name: /Nuevo registro|New record/i }).click();
  const installationForm = page.locator("form").first();
  await expect(getFieldControl(installationForm, /Dirección del cliente|Client address/i)).toBeVisible();
  await expect(installationForm.getByLabel(/^Orden$|^Sort order$/i)).toHaveCount(0);
  await page.getByRole("button", { name: /Cancelar|Cancel/i }).click();
  await page.getByRole("button", { name: /Expediente|Record/i }).first().click();
  const installationRecordDialog = page.getByRole("dialog", {
    name: /Expediente técnico de instalación|Installation technical record/i,
  });
  await expect(installationRecordDialog).toBeVisible();
  await expect(installationRecordDialog.getByText(/Puente con expediente técnico|Technical record bridge/i)).toBeVisible();
  await expect(installationRecordDialog.getByText(/Snapshot de instalación|Installation snapshot/i)).toBeVisible();
  await expect(installationRecordDialog.getByRole("heading", { name: /Cierre técnico reciente|Latest technical closure/i })).toBeVisible();
  await installationRecordDialog.getByRole("button", { name: /Cerrar|Close/i }).click();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/reports",
    /Reportes técnicos|Technical reports/i
  );
  await expect(page.getByText(/^(Cierres del período|Period closures)$/i)).toBeVisible();
  await expect(page.getByText(/^(Cobertura de cierre|Closure coverage)$/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Cobertura por tipo de equipo|Coverage by equipment type/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Instalaciones sin servicio reciente|Installations without recent service/i })).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/history",
    /Historial t[eé]cnico|Technical history/i
  );
  await expect(page.getByRole("heading", { name: /Historial t[eé]cnico|Technical history/i })).toBeVisible();
  const historyRows = page.locator("tbody tr");
  if ((await historyRows.count()) > 0) {
    await page.getByRole("button", { name: /Ver costos|View costing/i }).first().click();
    const historyCostingDialog = page.getByRole("dialog", {
      name: /Costos y cobro de mantención|Maintenance costing and billing/i,
    });
    await expect(page.getByRole("heading", { name: /Histórico de costos y cobro|Costing history/i })).toBeVisible();
    await expect(getFieldControl(historyCostingDialog, /Costo estimado total|Estimated total cost/i)).toBeVisible();
    await expect(getFieldControl(historyCostingDialog, /Monto cobrado|Amount charged/i)).toBeVisible();
    await expect(historyCostingDialog.getByRole("button", { name: /Agregar línea|Add line/i })).toHaveCount(0);
    await expect(historyCostingDialog.getByRole("button", { name: /Guardar estimado|Save estimate/i })).toHaveCount(0);
    await expect(historyCostingDialog.getByRole("button", { name: /Guardar costo real|Save actual cost/i })).toHaveCount(0);
    await historyCostingDialog.getByRole("button", { name: /Cerrar|Close/i }).click();

    await page.getByRole("button", { name: /Ver ficha|Open detail/i }).first().click();
    const historyDetailDialog = page.getByRole("dialog", {
      name: /Ficha de mantención|Maintenance detail/i,
    });
    await expect(historyDetailDialog).toBeVisible();
    await expect(historyDetailDialog.getByText(/Tipo de tarea|Task type/i).first()).toBeVisible();
    await expect(historyDetailDialog.getByText(/Perfil funcional|Function profile/i).first()).toBeVisible();
    await expect(historyDetailDialog.getByRole("button", { name: /Editar cierre|Edit closure/i })).toBeVisible();
    await expect(page.getByText(/Ficha histórica|Historical detail/i).last()).toBeVisible();
    await historyDetailDialog.getByRole("button", { name: /Cerrar|Close/i }).click();

    await page.getByRole("button", { name: /Ver checklist|View checklist/i }).first().click();
    const historyFieldReportDialog = page.getByRole("dialog", {
      name: /Checklist y evidencias de mantención|Maintenance checklist and evidence/i,
    });
    await expect(historyFieldReportDialog).toBeVisible();
    await expect(historyFieldReportDialog.getByRole("button", { name: /Guardar checklist|Save checklist/i })).toHaveCount(0);
    await expect(historyFieldReportDialog.locator('input[type="file"]')).toHaveCount(0);
    await expect(historyFieldReportDialog.getByRole("heading", { name: /Checklist técnico|Technical checklist/i })).toBeVisible();
    await expect(historyFieldReportDialog.getByRole("heading", { name: /^Evidencias$|^Evidence$/i })).toBeVisible();
    await historyFieldReportDialog.getByRole("button", { name: /Cerrar|Close/i }).click();
  }

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/calendar",
    /Agenda t[eé]cnica|Technical calendar/i
  );
  await expect(page.getByLabel(/Filtrar por grupo|Filter by group/i)).toBeVisible();
  await expect(page.getByLabel(/Filtrar por técnico|Filter by technician/i)).toBeVisible();
  const newMaintenanceButton = page.getByRole("button", { name: /Nueva mantenci[oó]n|New maintenance/i });
  await expect(newMaintenanceButton).toBeVisible();
  if (await newMaintenanceButton.isEnabled()) {
    await newMaintenanceButton.click();
    const calendarDialog = page.getByRole("dialog", {
      name: /Nueva mantención desde agenda|New maintenance from calendar/i,
    });
    await expect(calendarDialog).toBeVisible();
    await expect(getFieldControl(calendarDialog, /Grupo responsable|Responsible group/i)).toBeVisible();
    await expect(getFieldControl(calendarDialog, /Técnico responsable|Assigned technician/i)).toBeVisible();
  }
});
