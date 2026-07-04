        // --- EXPORTAR REPORTES (EXCEL Y PDF) ---
        function descargarExcelInvitados() {
            if (!invitadosCotejados || invitadosCotejados.length === 0) {
                return alert("Aún no hay invitados en la lista para descargar.");
            }

            const datosParaExcel = invitadosCotejados.map(inv => ({
                "Nombre Principal": inv.nombre,
                "Ingresó en Formulario": inv.nombreFormulario !== "-" ? inv.nombreFormulario : "No ha respondido",
                "Estado de Asistencia": inv.estado,
                "Menú Principal": inv.menu,
                "N° Acompañantes": inv.acompaniantes,
                "Detalle Acompañantes (Menús/Restricciones)": inv.detalleFamilia || "Sin acompañantes",
                "Grupo Familiar Asignado": inv.familiaManual || "Sin grupo",
                "Mesa Asignada": inv.mesaAsignada || "Sin asignar"
            }));

            const hojaDeTrabajo = XLSX.utils.json_to_sheet(datosParaExcel);
            const libroDeExcel = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libroDeExcel, hojaDeTrabajo, "Lista Oficial");
            XLSX.writeFile(libroDeExcel, "Lista_Invitados_Boda.xlsx");
        }

        function descargarPDFMesas() {
            const contenedorMesas = document.getElementById('galeria-mesas');
            if (!contenedorMesas || contenedorMesas.innerHTML.trim() === '') {
                return alert("Aún no hay mesas en el plano para descargar.");
            }

            const btn = document.querySelector('button[onclick="descargarPDFMesas()"]');
            const textoOriginal = btn.innerText;
            btn.innerText = "Generando PDF... ⏳";
            btn.disabled = true;

            const opcionesPDF = {
                margin:       10,
                filename:     'Tarjetas_de_Mesas_Boda.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            html2pdf().set(opcionesPDF).from(contenedorMesas).save().then(() => {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }).catch(err => {
                console.error("Error al generar el PDF:", err);
                alert("Hubo un problema al generar el documento.");
                btn.innerText = textoOriginal;
                btn.disabled = false;
            });
        }
