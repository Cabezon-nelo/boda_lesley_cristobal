        // --- EXPORTAR REPORTES (EXCEL Y PDF) (Módulo 6) ---
        function descargarReporte(tipo) {
            if (!invitadosCotejados || invitadosCotejados.length === 0) {
                return alert("Aún no hay invitados en la lista para generar el reporte.");
            }

            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');
            let datos = [];
            let nombreHoja = "Reporte";
            let nombreArchivo = "Reporte_Boda.xlsx";

            switch (tipo) {
                case 'lista-general':
                    datos = invitadosCotejados.map(inv => ({
                        "Nombre Principal": inv.nombre,
                        "Ingresó en Formulario": inv.nombreFormulario !== "-" ? inv.nombreFormulario : "No ha respondido",
                        "Estado de Asistencia": inv.estado,
                        "Menú Principal": inv.menu,
                        "N° Acompañantes": inv.acompaniantes,
                        "Detalle Acompañantes (Menús/Restricciones)": inv.detalleFamilia || "Sin acompañantes",
                        "Grupo Familiar Asignado": inv.familiaManual || "Sin grupo",
                        "Mesa Asignada": inv.mesaAsignada || "Sin asignar"
                    }));
                    nombreHoja = "Lista General";
                    nombreArchivo = "Lista_General_Boda.xlsx";
                    break;

                case 'cocina':
                    datos = soloConfirmados
                        .slice()
                        .sort((a, b) => a.menu.localeCompare(b.menu))
                        .map(inv => ({
                            "Menú": inv.menu,
                            "Nombre": inv.nombre,
                            "Mesa": inv.mesaAsignada || "Sin asignar",
                            "Notas / Acompañantes": inv.detalleFamilia || ""
                        }));
                    nombreHoja = "Cocina";
                    nombreArchivo = "Reporte_Cocina.xlsx";
                    break;

                case 'banquetero': {
                    let conteoMenus = {};
                    soloConfirmados.forEach(inv => {
                        let menu = inv.menu && inv.menu !== '-' ? inv.menu : 'Sin especificar';
                        conteoMenus[menu] = (conteoMenus[menu] || 0) + 1;
                    });
                    datos = Object.keys(conteoMenus).map(menu => ({ "Menú": menu, "Cantidad": conteoMenus[menu] }));
                    datos.push({ "Menú": "TOTAL", "Cantidad": soloConfirmados.length });
                    nombreHoja = "Banquetero";
                    nombreArchivo = "Reporte_Banquetero.xlsx";
                    break;
                }

                case 'decoracion':
                    datos = mesasBD.map(mesa => {
                        let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());
                        let ocupados = invitadosEnMesa.reduce((total, inv) => total + 1 + inv.acompaniantes, 0);
                        return { "Mesa": mesa.nombre, "Capacidad": mesa.capacidad, "Ocupados": ocupados };
                    });
                    nombreHoja = "Decoración";
                    nombreArchivo = "Reporte_Decoracion.xlsx";
                    break;

                case 'garzones':
                    datos = soloConfirmados
                        .slice()
                        .sort((a, b) => a.mesaAsignada.toString().localeCompare(b.mesaAsignada.toString()))
                        .map(inv => ({ "Mesa": inv.mesaAsignada || "Sin asignar", "Nombre": inv.nombre, "Menú": inv.menu }));
                    nombreHoja = "Garzones";
                    nombreArchivo = "Reporte_Garzones.xlsx";
                    break;

                case 'familias':
                    Object.keys(estructuraFamilias).forEach(nombreFamilia => {
                        estructuraFamilias[nombreFamilia].integrantes.forEach(inv => {
                            datos.push({ "Familia": nombreFamilia, "Nombre": inv.nombre, "Estado": inv.estado });
                        });
                    });
                    invitadosIndividuales.forEach(inv => {
                        datos.push({ "Familia": "Sin familia", "Nombre": inv.nombre, "Estado": inv.estado });
                    });
                    nombreHoja = "Familias";
                    nombreArchivo = "Reporte_Familias.xlsx";
                    break;

                case 'mesas':
                    datos = soloConfirmados
                        .slice()
                        .sort((a, b) => a.mesaAsignada.toString().localeCompare(b.mesaAsignada.toString()))
                        .map(inv => ({ "Mesa": inv.mesaAsignada || "Sin asignar", "Nombre": inv.nombre, "Acompañantes": inv.acompaniantes }));
                    nombreHoja = "Mesas";
                    nombreArchivo = "Reporte_Mesas.xlsx";
                    break;

                default:
                    return alert("Tipo de reporte no reconocido.");
            }

            if (datos.length === 0) {
                return alert("No hay datos suficientes todavía para generar este reporte.");
            }

            const hojaDeTrabajo = XLSX.utils.json_to_sheet(datos);
            const libroDeExcel = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libroDeExcel, hojaDeTrabajo, nombreHoja);
            XLSX.writeFile(libroDeExcel, nombreArchivo);
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
