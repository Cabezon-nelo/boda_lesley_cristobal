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
