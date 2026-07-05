        // --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
        const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzGuFMSYs5zF-xLZ0ADeDxjhW5Ay0jMPH8e6FRil5fX59uJC_yPYx_b2alyg3rCX0bSIw/exec";

        let listaOficialNombres = [];
        let respuestasInvitados = [];
        let invitadosCotejados = [];
        let mesasBD = [];
        let familiasDisponibles = [];
        let estructuraFamilias = {};
        let invitadosIndividuales = [];
        let posiblesDuplicados = [];

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

        function cambiarSubTab(grupo, subId) {
            document.querySelectorAll(`.subtab-content[data-grupo="${grupo}"]`).forEach(el => el.classList.remove('active'));
            document.querySelectorAll(`.subtab-btn[data-grupo="${grupo}"]`).forEach(btn => btn.classList.remove('active'));

            document.getElementById(subId).classList.add('active');

            const btnActivo = document.querySelector(`button[onclick="cambiarSubTab('${grupo}', '${subId}')"]`);
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

        // --- PROCESAMIENTO Y CRUCE DE DATOS (COTEJO) ---
        function realizarCotejo() {
            invitadosCotejados = [];
            familiasDisponibles = [];
            let respuestasProcesadas = new Set();

            // FASE 1: Recorrer la lista oficial y emparejar
            listaOficialNombres.forEach(nombreOficial => {
                if (!nombreOficial) return;

                // Los nombres tipo "Familia X" son la forma en que los novios pre-registran nombres de
                // familia (antes de que nadie responda). Nunca son un invitado real: se guardan aparte
                // para ofrecerlos como opción al agrupar, aunque todavía no tengan integrantes.
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

            // Excluimos de los conteos las respuestas que los novios ya marcaron como
            // "posible duplicado ignorado" (ver ignorarPosibleDuplicado en utilidades.js).
            // No se borra nada de la hoja: es solo un filtro local reversible.
            invitadosCotejados = invitadosCotejados.filter(inv => !estaIgnoradoComoDuplicado(inv.filaExcel));

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

            // FASE 4: Detección de posibles duplicados. Puede pasar que alguien
            // mencionado como acompañante (texto libre) también haya respondido el
            // formulario por su cuenta, generando 2 registros para las mismas 2
            // personas. Esto es solo una advertencia para revisión manual de los
            // novios: no oculta ni descuenta nada por sí sola (ver ignorarPosibleDuplicado).
            posiblesDuplicados = [];
            let paresYaVistos = new Set();
            invitadosCotejados.forEach((inv, i) => {
                let candidatos = extraerNombresCandidatos(inv.detalleFamilia);
                if (candidatos.length === 0) return;
                invitadosCotejados.forEach((otro, j) => {
                    if (i === j) return;
                    let coincide = candidatos.some(candidato =>
                        coincideParcialmente(candidato, otro.nombre) ||
                        coincideParcialmente(candidato, otro.nombreFormulario)
                    );
                    if (coincide) {
                        let claveParDePar = [inv.filaExcel, otro.filaExcel].sort().join('|');
                        if (!paresYaVistos.has(claveParDePar)) {
                            paresYaVistos.add(claveParDePar);
                            posiblesDuplicados.push({ origen: inv, coincideCon: otro });
                        }
                    }
                });
            });
        }

        // --- ORQUESTADOR DE RENDER: cada módulo pinta su propia sección ---
        function renderizarTodo() {
            renderizarEstadisticas();
            renderizarGraficoAsistencia();
            renderizarGraficoMenus();
            renderizarGraficoMesasOcupacion();
            renderizarAlertaDuplicados();
            renderizarListaInvitados();
            renderizarFichasInvitados();
            renderizarMesasVisual();
            renderizarPlanoMesas();
            renderizarPlanoRecinto();
            renderizarPestanaFamilias();
            renderizarFamiliasExistentes();
            poblarSelectorFamiliaDestino();
        }
