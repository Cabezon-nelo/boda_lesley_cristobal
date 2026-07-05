        // --- INVITADOS: CARGA MASIVA Y LISTA GENERAL (agrupada por familia) ---
        async function agregarInvitadosMasivo() {
            const textarea = document.getElementById('inv-masivo').value;
            if (!textarea.trim()) return alert("Por favor ingresa nombres.");

            const nombresArray = textarea.split('\n').map(n => n.trim()).filter(n => n !== "");
            const btn = document.querySelector('button[onclick="agregarInvitadosMasivo()"]');
            btn.innerText = "Cargando... ⏳";
            btn.disabled = true;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'cargar_masivo', nombres: nombresArray })
                });
                document.getElementById('inv-masivo').value = '';
                alert(`¡Carga masiva lista! Se agregaron ${nombresArray.length} invitados.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error en la carga masiva.");
            } finally {
                btn.innerText = "Cargar Lista";
                btn.disabled = false;
            }
        }

        // La agrupación ya viene resuelta desde realizarCotejo() en estructuraFamilias / invitadosIndividuales;
        // aquí solo se pinta.
        function renderizarListaInvitados() {
            const tbodyLista = document.getElementById('tabla-lista-oficial');
            tbodyLista.innerHTML = '';

            Object.keys(estructuraFamilias).forEach(nombreFamilia => {
                let integrantes = estructuraFamilias[nombreFamilia].integrantes;
                let filasIntegrantes = integrantes.map(inv => generarFilaInvitado(inv)).join('');

                tbodyLista.innerHTML += `
                    <tr>
                        <td colspan="4" style="padding: 0; border-bottom: none;">
                            <details style="margin: 12px 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                                <summary style="cursor: pointer; padding: 12px 15px; background: #fafafa; font-weight: bold;">
                                    👪 ${nombreFamilia}
                                    <span style="font-weight: normal; font-size: 0.85em; color: #666; margin-left: 8px;">${generarResumenFamilia(integrantes)}</span>
                                </summary>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tbody>${filasIntegrantes}</tbody>
                                </table>
                            </details>
                        </td>
                    </tr>
                `;
            });

            invitadosIndividuales.forEach(inv => {
                tbodyLista.innerHTML += generarFilaInvitado(inv);
            });
        }

        // --- FICHAS DE INVITADOS (Módulo 1, solo lectura por ahora) ---
        function generarFichaInvitado(inv) {
            let claseTag = 'tag-pendiente';
            if (inv.estado.toLowerCase() === 'sí' || inv.estado.toLowerCase() === 'si') claseTag = 'tag-si';
            if (inv.estado.toLowerCase() === 'no') claseTag = 'tag-no';

            let respondioFormulario = inv.nombreFormulario !== '-' ? 'Sí' : 'No';

            let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
            let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

            let htmlDetalleAcompanantes = '';
            if (tieneAcompanantesTexto) {
                let textoFormateado = inv.detalleFamilia.split('|').map(item => `• ${item.trim()}`).join('<br>');
                htmlDetalleAcompanantes = `<div class="ficha-acompanantes">${textoFormateado}</div>`;
            }

            return `
                <div class="ficha-invitado">
                    <div class="ficha-nombre">${inv.nombre}</div>
                    <div class="ficha-dato"><span class="ficha-label">Estado</span><span class="tag ${claseTag}">${inv.estado}</span></div>
                    <div class="ficha-dato"><span class="ficha-label">Menú</span><span>${inv.menu}</span></div>
                    <div class="ficha-dato"><span class="ficha-label">Mesa</span><span>${inv.mesaAsignada || 'Sin asignar'}</span></div>
                    <div class="ficha-dato"><span class="ficha-label">Familia</span><span>${inv.familiaManual || 'Sin familia'}</span></div>
                    <div class="ficha-dato"><span class="ficha-label">Acompañantes</span><span>${inv.acompaniantes}</span></div>
                    <div class="ficha-dato"><span class="ficha-label">Formulario</span><span>${respondioFormulario}</span></div>
                    ${htmlDetalleAcompanantes}
                </div>
            `;
        }

        function renderizarFichasInvitados() {
            const contenedor = document.getElementById('fichas-invitados-contenedor');
            if (!contenedor) return;
            contenedor.innerHTML = '';

            Object.keys(estructuraFamilias).forEach(nombreFamilia => {
                let integrantes = estructuraFamilias[nombreFamilia].integrantes;
                let fichasIntegrantes = integrantes.map(inv => generarFichaInvitado(inv)).join('');

                contenedor.innerHTML += `
                    <details class="familia-acordeon">
                        <summary class="familia-resumen">
                            👪 ${nombreFamilia}
                            <span class="familia-resumen-detalle">${generarResumenFamilia(integrantes)}</span>
                        </summary>
                        <div class="ficha-grid">${fichasIntegrantes}</div>
                    </details>
                `;
            });

            if (invitadosIndividuales.length > 0) {
                contenedor.innerHTML += `<div class="ficha-grid">${invitadosIndividuales.map(inv => generarFichaInvitado(inv)).join('')}</div>`;
            }
        }

        // --- ALERTA DE POSIBLES DUPLICADOS (ver detección en app.js/realizarCotejo) ---
        function renderizarAlertaDuplicados() {
            const contenedor = document.getElementById('alerta-duplicados-contenedor');
            if (!contenedor) return;

            if (!posiblesDuplicados || posiblesDuplicados.length === 0) {
                contenedor.innerHTML = '';
                return;
            }

            contenedor.innerHTML = posiblesDuplicados.map(par => {
                let botonesIgnorar = [par.origen, par.coincideCon]
                    .filter(inv => inv.enListaOficial === false)
                    .map(inv => `<button class="btn" onclick="ignorarPosibleDuplicado(${JSON.stringify(inv.filaExcel)})">Ignorar respuesta de "${inv.nombreFormulario}"</button>`)
                    .join(' ');

                return `
                    <div class="alerta-duplicado">
                        <strong>⚠️ Posible duplicado:</strong>
                        "${par.origen.nombre}" y "${par.coincideCon.nombre}" respondieron por separado, pero uno mencionó
                        al otro como acompañante — podrían ser las mismas 2 personas contadas dos veces.
                        <div style="margin-top:8px;">${botonesIgnorar}</div>
                    </div>
                `;
            }).join('');
        }

        // Lista de respuestas marcadas como "duplicado ignorado" (columna "Respuesta
        // Ignorada" en la hoja), con botón para revertir por si se marcó por error.
        function renderizarDuplicadosIgnorados() {
            const contenedor = document.getElementById('duplicados-ignorados-contenedor');
            if (!contenedor) return;

            if (!respuestasIgnoradasDuplicado || respuestasIgnoradasDuplicado.length === 0) {
                contenedor.innerHTML = '';
                return;
            }

            contenedor.innerHTML = `
                <details style="margin-bottom: 15px;">
                    <summary style="cursor:pointer; color:#888;">
                        ${respuestasIgnoradasDuplicado.length} respuesta(s) marcadas como duplicado ignorado
                    </summary>
                    <div style="margin-top:10px;">
                        ${respuestasIgnoradasDuplicado.map(inv => `
                            <div style="padding:8px 0; border-bottom:1px solid #eee;">
                                "${inv.nombreFormulario}" no se está contando en el panel.
                                <button class="btn" onclick="reactivarPosibleDuplicado(${JSON.stringify(inv.filaExcel)})">Reactivar</button>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        }
