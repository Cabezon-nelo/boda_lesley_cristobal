        // --- UTILIDADES / HELPERS COMPARTIDOS ---
        function limpiarTexto(texto) {
            if (!texto) return "";
            return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        }

        // Los nombres tipo "Familia X" son la etiqueta que se usa para agrupar invitados (ver selector de familias),
        // nunca un invitado real, por lo que nunca deben entrar a invitadosCotejados.
        function esNombreContenedorFamilia(nombre) {
            return !!nombre && nombre.toLowerCase().trim().startsWith('familia');
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

        // --- DETECCIÓN DE POSIBLES DUPLICADOS (acompañante que también respondió solo) ---

        // Del texto libre de acompañantes (separado por "|") extrae solo los nombres,
        // descartando el paréntesis de menú/restricción, ej:
        // "Maylink Saldaña Crespo (Menú: tradicional)" -> "Maylink Saldaña Crespo"
        function extraerNombresCandidatos(textoAcompanantes) {
            if (!textoAcompanantes) return [];
            // Se separa por "|" y también por " y " sueltos ("Fulano y Zutana"), ya que
            // algunos respondieron el nombre de la pareja como un solo texto sin usar "|".
            return textoAcompanantes.toString().split(/\||\s+y\s+/i)
                .map(item => item.replace(/\(.*$/, '').trim())
                .filter(nombre => nombre !== '');
        }

        // Calcula, para un conjunto de invitados, cuántos de ellos tienen cada palabra
        // (de 3+ letras) en su propio nombre. Sirve para no confiar en apellidos que se
        // repiten mucho en esta lista en particular (ej. "Crespo" si hay varias familias
        // con ese apellido) - ver coincideParcialmente.
        function calcularFrecuenciaTokens(invitados) {
            let frecuencia = {};
            invitados.forEach(inv => {
                let tokensUnicos = new Set(limpiarTexto(inv.nombre).split(/\s+/).filter(t => t.length >= 3));
                tokensUnicos.forEach(t => { frecuencia[t] = (frecuencia[t] || 0) + 1; });
            });
            return frecuencia;
        }

        // Coincidencia laxa a propósito: compara por apellidos/palabras compartidas
        // (no por "el nombre completo calza exacto"), porque en la práctica el mismo
        // invitado puede aparecer con variaciones ("Juan Rojas Vila" vs "Osvaldo Rojas
        // Vila", o con un nombre extra en medio). Es solo una advertencia para revisión
        // manual, así que preferimos detectar de más antes que dejar pasar el caso real.
        //
        // Si se pasa frecuenciaTokens (ver calcularFrecuenciaTokens), se exige que al
        // menos 2 de las palabras compartidas sean poco frecuentes en esta lista -
        // así "Crespo" solo (compartido por muchas familias distintas) no alcanza para
        // marcar un posible duplicado por sí solo.
        function coincideParcialmente(nombreA, nombreB, frecuenciaTokens) {
            let tokensA = limpiarTexto(nombreA).split(/\s+/).filter(t => t.length >= 3);
            let tokensB = limpiarTexto(nombreB).split(/\s+/).filter(t => t.length >= 3);
            let comunes = tokensA.filter(t => tokensB.includes(t));
            if (comunes.length < 2) return false;
            if (!frecuenciaTokens) return true;

            const UMBRAL_TOKEN_COMUN = 3;
            let comunesDistintivos = comunes.filter(t => (frecuenciaTokens[t] || 0) < UMBRAL_TOKEN_COMUN);
            return comunesDistintivos.length >= 2;
        }

        const CLAVE_DUPLICADOS_IGNORADOS = 'boda_duplicados_ignorados';

        function obtenerDuplicadosIgnorados() {
            try {
                return JSON.parse(localStorage.getItem(CLAVE_DUPLICADOS_IGNORADOS)) || [];
            } catch (e) {
                return [];
            }
        }

        function estaIgnoradoComoDuplicado(filaExcel) {
            if (filaExcel === null || filaExcel === undefined) return false;
            return obtenerDuplicadosIgnorados().includes(filaExcel);
        }

        // Marca una respuesta como "ya revisado, es un duplicado real": se excluye de
        // los conteos hasta que se reactive. No borra nada de la hoja de cálculo.
        function ignorarPosibleDuplicado(filaExcel) {
            let ignorados = obtenerDuplicadosIgnorados();
            if (!ignorados.includes(filaExcel)) {
                ignorados.push(filaExcel);
                localStorage.setItem(CLAVE_DUPLICADOS_IGNORADOS, JSON.stringify(ignorados));
            }
            realizarCotejo();
            renderizarTodo();
        }

        function reactivarPosibleDuplicado(filaExcel) {
            let ignorados = obtenerDuplicadosIgnorados().filter(f => f !== filaExcel);
            localStorage.setItem(CLAVE_DUPLICADOS_IGNORADOS, JSON.stringify(ignorados));
            realizarCotejo();
            renderizarTodo();
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
