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
