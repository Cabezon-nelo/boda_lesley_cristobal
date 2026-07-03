        // --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
        const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzGuFMSYs5zF-xLZ0ADeDxjhW5Ay0jMPH8e6FRil5fX59uJC_yPYx_b2alyg3rCX0bSIw/exec"; 
        
        let listaOficialNombres = [];
        let respuestasInvitados = [];
        let invitadosCotejados = [];
        let mesasBD = [];
        let familiasDisponibles = [];
        let estructuraFamilias = {};
        let invitadosIndividuales = [];

        window.onload = function() {
            const token = localStorage.getItem('token_novios'); 
            if (token) {
                mostrarDashboard();
                cargarDatosDesdeExcel();
            }
        };

        // --- FUNCIONES DE INTERFAZ ---
        function mostrarDashboard() {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('panel-screen').style.display = 'block';
        }
        
        function cambiarPestaña(tabId) {
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            const botones = document.querySelectorAll('.nav-btn');
            botones.forEach(btn => btn.classList.remove('active'));
            
            document.getElementById(tabId).classList.add('active');
            
            const btnActivo = document.querySelector(`button[onclick="cambiarPestaña('${tabId}')"]`);
            if(btnActivo) btnActivo.classList.add('active');
        }

        async function verificarPassword() {
            const input = document.getElementById('password-input').value;
            const btn = document.querySelector('#login-screen button');
            if (!input) return alert("Ingresa la contraseña");
            
            btn.innerText = "Verificando... ⏳";
            btn.disabled = true;
        
            try {
                const respuesta = await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'login_novios', password: input })
                });
                const resultado = await respuesta.json();
        
                if (resultado.success) {
                    localStorage.setItem('token_novios', resultado.token);
                    mostrarDashboard();
                    cargarDatosDesdeExcel();
                } else {
                    alert("Contraseña incorrecta.");
                }
            } catch (e) {
                alert("Error conectando con la base de datos.");
            } finally {
                btn.innerText = "Ingresar al Dashboard";
                btn.disabled = false;
            }
        }
        
        // --- LOGÍSTICA BACKEND (GOOGLE APPS SCRIPT) ---
        async function cargarDatosDesdeExcel() {
            document.getElementById('stat-total').innerText = "...";
            try {
                const respuesta = await fetch(URL_GOOGLE_SCRIPT);
                const baseDatos = await respuesta.json();
                
                listaOficialNombres = baseDatos.listaOficialNovios || [];
                respuestasInvitados = baseDatos.respuestasInvitados || [];
                mesasBD = baseDatos.mesasDefinidas || []; 
                
                realizarCotejo();
                renderizarTodo();
            } catch (e) {
                console.error("Error cargando datos:", e);
                alert("Hubo un problema descargando los datos de los invitados y mesas.");
            }
        }
        
        async function crearMesa() {
            let nombre = document.getElementById('mesa-nombre').value.trim();
            let cap = parseInt(document.getElementById('mesa-capacidad').value);
            if(!nombre || !cap) return alert("Por favor completa ambos campos.");
        
            const btn = document.querySelector('button[onclick="crearMesa()"]');
            btn.innerText = "Guardando... ⏳";
            btn.disabled = true;
        
            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'crear_mesa', nombreMesa: nombre, capacidad: cap })
                });
                
                document.getElementById('mesa-nombre').value = '';
                document.getElementById('mesa-capacidad').value = '';
                await cargarDatosDesdeExcel();
                alert(`¡Mesa "${nombre}" guardada con éxito!`);
            } catch (e) {
                alert("Hubo un error al guardar la mesa.");
            } finally {
                btn.innerText = "Crear Mesa";
                btn.disabled = false;
            }
        }
        
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
        
        async function guardarMesaInvitado(fila) {
            const selector = document.getElementById(`sel-mesa-${fila}`);
            const mesaSeleccionada = selector.value;
            
            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'asignar_mesa', fila: fila, nuevaMesa: mesaSeleccionada })
                });
                alert("Mesa guardada con éxito.");
                await cargarDatosDesdeExcel(); 
            } catch(e) {
                alert("No se pudo guardar la asignación.");
            }
        }
        
        // --- PROCESAMIENTO Y CRUCE DE DATOS (COTEJO) ---
        function limpiarTexto(texto) {
            if (!texto) return "";
            return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        }

        // Los nombres tipo "Familia X" son la etiqueta que se usa para agrupar invitados (ver selector de familias),
        // nunca un invitado real, por lo que nunca deben entrar a invitadosCotejados.
        function esNombreContenedorFamilia(nombre) {
            return !!nombre && nombre.toLowerCase().trim().startsWith('familia');
        }

        function realizarCotejo() {
            invitadosCotejados = [];
            familiasDisponibles = [];
            let respuestasProcesadas = new Set();

            // FASE 1: Recorrer la lista oficial y emparejar
            listaOficialNombres.forEach(nombreOficial => {
                if (!nombreOficial) return;

                if (esNombreContenedorFamilia(nombreOficial)) {
                    familiasDisponibles.push(nombreOficial);
                    return;
                }

                let oficialLimpio = limpiarTexto(nombreOficial);
        
                let respForm = respuestasInvitados.find((r, index) => {
                    if (respuestasProcesadas.has(index)) return false; 
                    let respLimpia = limpiarTexto(r.nombre);
                    return oficialLimpio.includes(respLimpia) || respLimpia.includes(oficialLimpio);
                });
        
                if (respForm) {
                    let idx = respuestasInvitados.indexOf(respForm);
                    respuestasProcesadas.add(idx); 
                    
                    let textoAcompanantes = respForm.acompanantes ? respForm.acompanantes.toString().trim() : "";
                    console.log(JSON.stringify(textoAcompanantes));
                    
                    // APLICAMOS LA NUEVA HERRAMIENTA AQUÍ
                    let numAcompaniantes = calcularNumeroAcompanantes(textoAcompanantes);
                    
                    invitadosCotejados.push({
                        nombre: nombreOficial, 
                        nombreFormulario: respForm.nombre, 
                        estado: respForm.asistencia,
                        menu: respForm.menu || "Estándar",
                        acompaniantes: numAcompaniantes,
                        detalleFamilia: textoAcompanantes,
                        familiaManual: respForm.familia || "", 
                        mesaAsignada: respForm.mesa || "",
                        filaExcel: respForm.fila,
                        enListaOficial: true
                    });
                } else {
                    invitadosCotejados.push({
                        nombre: nombreOficial,
                        nombreFormulario: "-",
                        estado: "Pendiente",
                        menu: "-",
                        acompaniantes: 0,
                        detalleFamilia: "",
                        familiaManual: respForm ? (respForm.familia || "") : "",
                        mesaAsignada: "",
                        filaExcel: null,
                        enListaOficial: true
                    });
                }
            });
        
            // FASE 2: Capturar respuestas directas (sin estar en lista oficial)
            respuestasInvitados.forEach((respForm, index) => {
                if (!respuestasProcesadas.has(index)) { 
                    let textoAcompanantes = respForm.acompanantes ? respForm.acompanantes.toString().trim() : "";
                    
                    // APLICAMOS LA NUEVA HERRAMIENTA AQUÍ
                    let numAcompaniantes = calcularNumeroAcompanantes(textoAcompanantes);
                    
                    invitadosCotejados.push({
                        nombre: respForm.nombre, 
                        nombreFormulario: respForm.nombre, 
                        estado: respForm.asistencia,
                        menu: respForm.menu || "Estándar",
                        acompaniantes: numAcompaniantes,
                        detalleFamilia: textoAcompanantes,
                        familiaManual: respForm.familia || "", 
                        mesaAsignada: respForm.mesa || "",
                        filaExcel: respForm.fila,
                        enListaOficial: false
                    });
                }
            });

            // FASE 3: Derivar la estructura de familias e individuales a partir del cotejo,
            // para que el render ya no tenga que volver a agrupar invitados.
            estructuraFamilias = {};
            invitadosIndividuales = [];
            invitadosCotejados.forEach(inv => {
                if (inv.familiaManual) {
                    if (!estructuraFamilias[inv.familiaManual]) {
                        estructuraFamilias[inv.familiaManual] = { integrantes: [] };
                    }
                    estructuraFamilias[inv.familiaManual].integrantes.push(inv);
                } else {
                    invitadosIndividuales.push(inv);
                }
            });
        }

        // --- RENDERIZADO VISUAL ---
        function generarFilaInvitado(inv) {
            let claseTag = 'tag-pendiente';
            if (inv.estado.toLowerCase() === 'sí' || inv.estado.toLowerCase() === 'si') claseTag = 'tag-si';
            if (inv.estado.toLowerCase() === 'no') claseTag = 'tag-no';

            let etiquetaNoOficial = !inv.enListaOficial ? ` <span style="font-size:0.75em; background:#fff3e0; color:#e65100; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:5px;">Formulario Directo</span>` : '';

            let htmlAcompanantes = '';
            let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
            let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

            if (tieneAcompanantesTexto) {
                // Reemplazamos el " | " por un salto de línea y un guión para que se vea como lista
                let textoFormateado = inv.detalleFamilia.split('|').map(item => `• ${item.trim()}`).join('<br>');

                htmlAcompanantes = `
                    <div style="margin-top: 8px; padding: 8px 12px; background: #fdfbf7; border-left: 3px solid var(--color-principal); font-size: 0.85em; color: #555; border-radius: 0 4px 4px 0; line-height: 1.4;">
                        <strong>Acompañantes y Restricciones:</strong><br>
                        ${textoFormateado}
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <strong>${inv.nombre}</strong>${etiquetaNoOficial}<br>
                        <small style="color:#888;">Ingresó como: ${inv.nombreFormulario}</small>
                        ${htmlAcompanantes}
                    </td>
                    <td><span class="tag ${claseTag}">${inv.estado}</span></td>
                    <td>${inv.menu}</td>
                    <td>${inv.acompaniantes}</td>
                </tr>
            `;
        }

        function generarResumenFamilia(integrantes) {
            const esConfirmado = estado => estado.toLowerCase() === 'sí' || estado.toLowerCase() === 'si';
            const confirmados = integrantes.filter(i => esConfirmado(i.estado)).length;
            const pendientes = integrantes.filter(i => i.estado.toLowerCase() === 'pendiente').length;
            const noAsisten = integrantes.filter(i => i.estado.toLowerCase() === 'no').length;

            let partes = [];
            if (confirmados) partes.push(`✔ ${confirmados} confirmado${confirmados !== 1 ? 's' : ''}`);
            if (pendientes) partes.push(`⏳ ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`);
            if (noAsisten) partes.push(`✖ ${noAsisten} no asiste${noAsisten !== 1 ? 'n' : ''}`);
            return partes.join(' · ') || 'Sin respuestas';
        }

        function renderizarTodo() {
            // --- ESTADÍSTICAS ---
            document.getElementById('stat-total').innerText = invitadosCotejados.length;
            document.getElementById('stat-si').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si').length;
            document.getElementById('stat-no').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'no').length;
            document.getElementById('stat-pendiente').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'pendiente').length;
        
            // --- TABLA 1: LISTA GENERAL DE INVITADOS (agrupada por familia) ---
            // La agrupación ya viene resuelta desde realizarCotejo() en estructuraFamilias / invitadosIndividuales;
            // aquí solo se pinta.
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

            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');
        
            // --- TABLA 2: GESTIÓN DE MESAS DEFINIDAS ---
            const tbodyMesas = document.getElementById('tabla-mesas-creadas');
            tbodyMesas.innerHTML = '';
            mesasBD.forEach(mesa => {
                let asignadosAqui = 0;
                let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());
                
                invitadosEnMesa.forEach(inv => {
                    asignadosAqui += (1 + inv.acompaniantes);
                });
        
                let disponible = mesa.capacidad - asignadosAqui;
        
                tbodyMesas.innerHTML += `
                    <tr>
                        <td>${mesa.nombre}</td>
                        <td>${mesa.capacidad}</td>
                        <td>${asignadosAqui}</td>
                        <td>${disponible <= 0 ? '❌ Lleno' : disponible}</td>
                        <td>
                            <button class="btn" style="padding: 5px 10px; font-size: 0.8em;" onclick="editarMesa('${mesa.nombre}', ${mesa.capacidad})">✏️ Editar</button>
                            <button class="btn" style="padding: 5px 10px; font-size: 0.8em; background-color: #F44336;" onclick="eliminarMesa('${mesa.nombre}')">🗑️ Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        
            // --- TABLA 3: ASIGNACIÓN DE MESAS ---
            const tbodyAsignacion = document.getElementById('tabla-asignacion-mesas');
            tbodyAsignacion.innerHTML = '';
            soloConfirmados.forEach(inv => {
                let opcionesMesas = `<option value="">-- Seleccionar Mesa --</option>`;
                mesasBD.forEach(m => {
                    let seleccionado = inv.mesaAsignada.toString().trim() === m.nombre.toString().trim() ? 'selected' : '';
                    opcionesMesas += `<option value="${m.nombre}" ${seleccionado}>${m.nombre}</option>`;
                });

                let etiquetaGrupo = "";
                if (inv.familiaManual) {
                    etiquetaGrupo = `<br><span style="background: #e3f2fd; color: #0d47a1; font-size: 0.8em; padding: 2px 6px; border-radius: 4px; font-weight: bold;">👪 Vinculado a: ${inv.familiaManual}</span>`;
                }
                
                let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
                let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

                if (tieneAcompanantesTexto) {
                    etiquetaGrupo += `<br><small style="color: #777;"><strong>Acompañantes:</strong> ${inv.detalleFamilia}</small>`;
                }

                tbodyAsignacion.innerHTML += `
                    <tr>
                        <td><strong>${inv.nombre}</strong>${etiquetaGrupo}</td>
                        <td>${inv.acompaniantes}</td>
                        <td>
                            <select id="sel-mesa-${inv.filaExcel}">
                                ${opcionesMesas}
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-success" onclick="guardarMesaInvitado(${inv.filaExcel})">Guardar</button>
                        </td>
                    </tr>
                `;
            });
        
            // --- PLANO VISUAL DE MESAS (TARJETAS PDF) ---
            const galeriaMesas = document.getElementById('galeria-mesas');
            if(galeriaMesas) {
                galeriaMesas.innerHTML = '';
                mesasBD.forEach(mesa => {
                    let sillasOcupadas = 0;
                    let listaNombresHTML = '';
                    let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());
        
                    invitadosEnMesa.forEach(inv => {
                        let totalSillasGrupo = 1 + inv.acompaniantes; 
                        sillasOcupadas += totalSillasGrupo;
                        let textoAcomp = inv.acompaniantes > 0 ? ` <em>(+${inv.acompaniantes})</em>` : '';
                        
                        let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
                        let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";
                        
                        let detalleAcompHTML = tieneAcompanantesTexto ? `<br><small style="color:#666; font-size:0.85em; display:block; padding-left:10px; font-style:italic; font-weight:normal; text-transform:none;">↳ ${inv.detalleFamilia}</small>` : '';

                        listaNombresHTML += `
                            <div class="invitado-item" style="flex-direction: column; align-items: flex-start; border-bottom: 1px dashed #eee; padding: 6px 0;">
                                <div style="display: flex; justify-content: space-between; width: 100%;">
                                    <span>${inv.nombre}${textoAcomp}</span>
                                    <strong>${totalSillasGrupo} <small>sillas</small></strong>
                                </div>
                                ${detalleAcompHTML}
                            </div>
                        `;
                    });
        
                    let sillasLibres = mesa.capacidad - sillasOcupadas;
                    let estadoSillasClase = sillasLibres < 0 ? 'sillas-llena' : 'sillas-ok';
                    let textoEstadoSillas = sillasLibres < 0 ? `⚠️ Faltan ${Math.abs(sillasLibres)} sillas` : `✓ ${sillasLibres} sillas disponibles`;
        
                    let numeroMesaVisual = mesa.nombre.replace(/[^0-9]/g, ''); 
                    if(!numeroMesaVisual) numeroMesaVisual = mesa.nombre; 
        
                    galeriaMesas.innerHTML += `
                        <div class="mesa-card">
                            <h2 class="numero">${numeroMesaVisual}</h2>
                            <h3 class="titulo">Mesa</h3>
                            <div class="novios">Lesley y Cristóbal</div>
                            <div class="fecha">17 / 10 / 2026</div>
                            <div class="lista-invitados">
                                ${listaNombresHTML || '<div style="color:#aaa; text-align:center; padding-top:20px;">Mesa vacía</div>'}
                            </div>
                            <div class="sillas-info ${estadoSillasClase}">
                                Ocupadas: ${sillasOcupadas} / ${mesa.capacidad} <br>
                                ${textoEstadoSillas}
                            </div>
                        </div>
                    `;
                });
            }

            renderizarPestanaFamilias();
            cargarSelectorFamilias();
            mostrarIntegrantesFamilia();
        }

        // --- GESTIÓN DE GRUPOS FAMILIARES ---
        function renderizarPestanaFamilias() {
            let tbody = document.getElementById("tbody-seleccion-familias");
            if (!tbody) return;
            tbody.innerHTML = "";

            invitadosCotejados.forEach((inv, index) => {
                // CORRECCIÓN: Solo validamos que sea Formulario Directo, sin importar cuántos acompañantes traiga.
                if (inv.enListaOficial === false) {
                    
                    let familiaMostrar = inv.familiaManual
                        ? inv.familiaManual
                        : (inv.acompaniantes > 0 ? "Trae acompañantes" : "Ninguna (Individual)");
                    
                    tbody.innerHTML += `
                        <tr>
                            <td>
                                <input type="checkbox" class="chk-invitado-familia" data-index="${index}" style="transform: scale(1.2);">
                            </td>
                            <td>
                                <strong>${inv.nombre}</strong><br>
                                <span style="font-size:0.8em; color:#777;">Resp: ${inv.nombreFormulario}</span>
                            </td>
                            <td>${inv.estado}</td>
                            <td>
                                <span style="padding: 4px 8px; background: ${inv.familiaManual ? '#e3f2fd' : '#f5f5f5'}; border-radius: 4px; font-size: 0.9em;">
                                    ${familiaMostrar}
                                </span>
                            </td>
                        </tr>
                    `;
                }
            });
        }
            function cargarSelectorFamilias(){
                let selector=document.getElementById("sel-familia-oficial");
                if(!selector) return;
                selector.innerHTML="";
                familiasDisponibles.forEach(nombre=>{
                    selector.innerHTML+=`
                        <option value="${nombre}">
                            ${nombre}
                        </option>
                    `;
                });
            }
            async function crearGrupoFamiliar() {
            let selector = document.getElementById("sel-familia-oficial");
            if (!selector)
                return alert("No se encontró el selector de familias.")
            let nombreFamilia = selector.value.trim();
            if (!nombreFamilia)
                return alert("Por favor, ingresa un nombre para el grupo familiar.");
            let checkboxes = document.querySelectorAll(".chk-invitado-familia:checked");
            if (checkboxes.length === 0)
                return alert("Selecciona al menos un invitado.");
            let filas = [];
            checkboxes.forEach(chk => {
                let index = parseInt(chk.dataset.index);
                let invitado = invitadosCotejados[index];
                if (invitado.filaExcel)
                    filas.push(invitado.filaExcel);
            });
            try {        
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: "POST",
                    body: JSON.stringify({
                        accion: "guardar_familia",
                        familia: nombreFamilia,
                        filas: filas
                    })
                });
                await cargarDatosDesdeExcel();
                document.querySelectorAll(".chk-invitado-familia").forEach(c => c.checked = false);
                alert(`Grupo "${nombreFamilia}" guardado correctamente.`);
            } catch (e) {
                alert("No fue posible guardar la familia.");
            }
        }

        // --- ACCIONES DE MESAS ---
        async function eliminarMesa(nombreMesa) {
            if (!confirm(`¿Estás seguro de que deseas eliminar la mesa "${nombreMesa}"?`)) return;
            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'eliminar_mesa', nombreMesa: nombreMesa })
                });
                alert(`Mesa "${nombreMesa}" eliminada.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error al eliminar la mesa.");
            }
        }
        
        async function editarMesa(nombreOriginal, capacidadOriginal) {
            let nuevoNombre = prompt("Modifica el nombre de la mesa:", nombreOriginal);
            if (!nuevoNombre) return;
        
            let nuevaCapacidad = prompt("Modifica la capacidad máxima:", capacidadOriginal);
            if (!nuevaCapacidad || isNaN(nuevaCapacidad)) return;
        
            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        accion: 'editar_mesa', 
                        nombreOriginal: nombreOriginal,
                        nuevoNombre: nuevoNombre.trim(),
                        nuevaCapacidad: parseInt(nuevaCapacidad)
                    })
                });
                alert(`Mesa actualizada con éxito.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error al editar la mesa.");
            }
        }

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
        // HERRAMIENTA: Analizador exacto basado en el separador "|"
        function calcularNumeroAcompanantes(texto) {
            if (!texto) return 0;
            let t = texto.toString().trim();
            if (
                t === "" ||
                t === "-" ||
                t.toLowerCase() === "no" ||
                t.toLowerCase() === "ninguno" ||
                t.toLowerCase() === "sin acompañantes"
            ){
                return 0;
            }
            // Divide por cualquier barra vertical con o sin espacios
            let personas = t
                .split(/\s*\|\s*/)
                .filter(p => p.trim() !== "");
            console.log(personas);
            return personas.length;
        }

        function mostrarIntegrantesFamilia(){
            let familia=document.getElementById("sel-familia-oficial").value;
            let contenedor=document.getElementById("lista-integrantes-familia");
            if(!familia){
                contenedor.innerHTML="Sin familia seleccionada.";
                return;
            }
            let integrantes = estructuraFamilias[familia] ? estructuraFamilias[familia].integrantes : [];
            if(integrantes.length===0){
                contenedor.innerHTML=`
                    <span style="color:#888;">
                        Esta familia aún no tiene integrantes asociados.
                    </span>
                `;
                return;
            }
            contenedor.innerHTML="";
            integrantes.forEach(inv=>{
                contenedor.innerHTML+=`
                    <div style="
                        padding:6px 0;
                        border-bottom:1px solid #eee;">
                        ✔ ${inv.nombre}
                    </div>
                `;
            });
            console.log("Familia seleccionada:", familia);
            console.table(invitadosCotejados.map(i => ({
                nombre: i.nombre,
                familia: i.familiaManual
            })));
        }
