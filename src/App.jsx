import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://asistencia-api-prueba.onrender.com";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const formularioVacio = {
  nombre: "",
  apellido: "",
  usuario: "",
  contrasenia: "",
};

/* =====================================================
   FUNCIONES PARA ASISTENCIAS
===================================================== */

const formatearHora = (fecha) => {
  if (!fecha) return "Pendiente";

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return "Pendiente";
  }

  return fechaObj.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const obtenerDiaActual = () => {
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  return dias[new Date().getDay()];
};

const esDeHoy = (fecha) => {
  if (!fecha) return false;

  const fechaAsistencia = new Date(fecha);
  const hoy = new Date();

  return (
    fechaAsistencia.getFullYear() === hoy.getFullYear() &&
    fechaAsistencia.getMonth() === hoy.getMonth() &&
    fechaAsistencia.getDate() === hoy.getDate()
  );
};

/* =====================================================
   COMPONENTE DE ASISTENCIAS
===================================================== */

function PantallaAsistencias() {
  const [registros, setRegistros] = useState([]);
  const [registrosNoDocentes, setRegistrosNoDocentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const cargarAsistencias = async () => {
    try {
      setCargando(true);
      setMensaje("");

      // ============================================
      // DOCENTES
      // ============================================

      const respuestaDocentes = await fetch(
        `${API_URL}/usuarios/?tipo_empleado=docente`
      );

      if (!respuestaDocentes.ok) {
        throw new Error("No se pudieron cargar los docentes.");
      }

      const docentes = await respuestaDocentes.json();

      // ============================================
      // NO DOCENTES
      // ============================================

      const respuestaNoDocentes = await fetch(
        `${API_URL}/usuarios/?tipo_empleado=no_docente`
      );

      if (!respuestaNoDocentes.ok) {
        throw new Error("No se pudieron cargar los no docentes.");
      }

      const noDocentes = await respuestaNoDocentes.json();

      // ============================================
      // MATERIAS
      // ============================================

      const respuestaMaterias = await fetch(
        `${API_URL}/materias/`
      );

      if (!respuestaMaterias.ok) {
        throw new Error("No se pudieron cargar las materias.");
      }

      const materias = await respuestaMaterias.json();

      // ============================================
      // ASISTENCIAS DOCENTES
      // ============================================

      const registrosFinales = [];

      for (const docente of docentes) {
        const respuestaAsignaciones = await fetch(
          `${API_URL}/docente-materia/?id_usuario=${docente.id_usuario}`
        );

        if (!respuestaAsignaciones.ok) {
          continue;
        }

        const asignaciones =
          await respuestaAsignaciones.json();

        const respuestaAsistencias = await fetch(
          `${API_URL}/asistencias/?id_usuario=${docente.id_usuario}`
        );

        if (!respuestaAsistencias.ok) {
          continue;
        }

        const asistencias =
          await respuestaAsistencias.json();

        const diaActual = obtenerDiaActual();

        // Solo materias correspondientes al día actual
        const asignacionesDelDia = asignaciones.filter(
          (asignacion) =>
            asignacion.dia_semana?.trim().toLowerCase() ===
            diaActual.trim().toLowerCase()
        );

        for (const asignacion of asignacionesDelDia) {
          const materia = materias.find(
            (item) =>
              item.id_materia === asignacion.id_materia
          );

          const asistenciaHoy = asistencias.find(
            (asistencia) =>
              asistencia.id_materia ===
                asignacion.id_materia &&
              esDeHoy(
                asistencia.fecha_hora_entrada
              )
          );

          registrosFinales.push({
            id: `${docente.id_usuario}-${asignacion.id_docente_materia}`,

            docente: `${docente.nombre} ${docente.apellido}`,

            materia:
              materia?.nombre_materia ||
              "Materia desconocida",

            dia: asignacion.dia_semana,

            entrada:
              asistenciaHoy?.fecha_hora_entrada ||
              null,

            salida:
              asistenciaHoy?.fecha_hora_salida ||
              null,

            esHoy: true,
          });
        }
      }

      registrosFinales.sort((a, b) =>
        a.docente.localeCompare(b.docente)
      );

      setRegistros(registrosFinales);

      // ============================================
      // ASISTENCIAS NO DOCENTES
      // ============================================

      const registrosNoDocentesFinales = [];

      for (const empleado of noDocentes) {
        const respuestaAsistencias = await fetch(
          `${API_URL}/asistencias/?id_usuario=${empleado.id_usuario}`
        );

        let asistencias = [];

        if (respuestaAsistencias.ok) {
          asistencias =
            await respuestaAsistencias.json();
        }

        // Buscar solamente la asistencia de HOY
        const asistenciasDeHoy = asistencias
          .filter((asistencia) =>
            esDeHoy(
              asistencia.fecha_hora_entrada
            )
          )
          .sort(
            (a, b) =>
              new Date(
                b.fecha_hora_entrada
              ) -
              new Date(
                a.fecha_hora_entrada
              )
          );

        const asistenciaHoy =
          asistenciasDeHoy[0];

        registrosNoDocentesFinales.push({
          id: empleado.id_usuario,

          empleado: `${empleado.nombre} ${empleado.apellido}`,

          entrada:
            asistenciaHoy?.fecha_hora_entrada ||
            null,

          salida:
            asistenciaHoy?.fecha_hora_salida ||
            null,
        });
      }

      registrosNoDocentesFinales.sort((a, b) =>
        a.empleado.localeCompare(b.empleado)
      );

      setRegistrosNoDocentes(
        registrosNoDocentesFinales
      );

    } catch (error) {
      console.error(error);
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // ============================================
  // CARGAR Y ACTUALIZAR CADA 10 SEGUNDOS
  // ============================================

  useEffect(() => {
  const iniciarCarga = setTimeout(() => {
    cargarAsistencias();
  }, 0);

  const intervalo = setInterval(() => {
    cargarAsistencias();
  }, 10000);

  return () => {
    clearTimeout(iniciarCarga);
    clearInterval(intervalo);
  };
}, []);

  return (
    <div className="asistencias-admin">

      {/* ==========================================
          CABECERA
      ========================================== */}

      <div className="asistencias-admin-cabecera">

        <div>

          <h2>📋 Registro de asistencias</h2>

          <p>
            Control de entrada y salida del personal
          </p>

          <span>
            Día actual:{" "}
            <strong>
              {obtenerDiaActual()}
            </strong>
          </span>

        </div>

        <button
          type="button"
          className="btn-actualizar"
          onClick={cargarAsistencias}
        >
          🔄 Actualizar
        </button>

      </div>

      {/* ==========================================
          MENSAJE
      ========================================== */}

      {mensaje && (
        <div className="mensaje">
          {mensaje}
        </div>
      )}

      {cargando ? (

        <p className="sin-datos">
          Cargando asistencias...
        </p>

      ) : (

        <>

          {/* ========================================
              DOCENTES
          ======================================== */}

          <div className="tabla-contenedor">

            <h2>
              👩‍🏫 Asistencias de docentes
            </h2>

            {registros.length === 0 ? (

              <p className="sin-datos">
                No hay materias asignadas a docentes
                para hoy.
              </p>

            ) : (

              <div className="tabla-scroll">

                <table>

                  <thead>

                    <tr>
                      <th>Docente</th>
                      <th>Materia</th>
                      <th>Día</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                    </tr>

                  </thead>

                  <tbody>

                    {registros.map((registro) => (

                      <tr
                        key={registro.id}
                        className={
                          registro.esHoy
                            ? "fila-hoy"
                            : ""
                        }
                      >

                        <td>
                          <strong>
                            {registro.docente}
                          </strong>
                        </td>

                        <td>
                          {registro.materia}
                        </td>

                        <td>
                          <span className="dia-hoy">
                            📅 {registro.dia}
                          </span>
                        </td>

                        <td>

                          {registro.entrada ? (

                            <span className="estado-asistencia registrada">

                              ✅ Entrada registrada

                              <br />

                              <small>
                                {formatearHora(
                                  registro.entrada
                                )}
                              </small>

                            </span>

                          ) : (

                            <span className="estado-asistencia pendiente">
                              ⏳ Sin registrar
                            </span>

                          )}

                        </td>

                        <td>

                          {registro.salida ? (

                            <span className="estado-asistencia registrada">

                              ✅ Salida registrada

                              <br />

                              <small>
                                {formatearHora(
                                  registro.salida
                                )}
                              </small>

                            </span>

                          ) : registro.entrada ? (

                            <span className="estado-asistencia pendiente">
                              🟡 Salida pendiente
                            </span>

                          ) : (

                            <span className="estado-asistencia pendiente">
                              ⏳ Sin registrar
                            </span>

                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

          {/* ========================================
              NO DOCENTES
          ======================================== */}

          <div
            className="tabla-contenedor"
            style={{ marginTop: "30px" }}
          >

            <h2>
              👷 Asistencias de no docentes
            </h2>

            {registrosNoDocentes.length === 0 ? (

              <p className="sin-datos">
                No hay no docentes registrados.
              </p>

            ) : (

              <div className="tabla-scroll">

                <table>

                  <thead>

                    <tr>
                      <th>Empleado</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                    </tr>

                  </thead>

                  <tbody>

                    {registrosNoDocentes.map(
                      (registro) => (

                        <tr key={registro.id}>

                          <td>
                            <strong>
                              {registro.empleado}
                            </strong>
                          </td>

                          <td>

                            {registro.entrada ? (

                              <span className="estado-asistencia registrada">

                                ✅ Entrada registrada

                                <br />

                                <small>
                                  {formatearHora(
                                    registro.entrada
                                  )}
                                </small>

                              </span>

                            ) : (

                              <span className="estado-asistencia pendiente">
                                ⏳ Sin registrar
                              </span>

                            )}

                          </td>

                          <td>

                            {registro.salida ? (

                              <span className="estado-asistencia registrada">

                                ✅ Salida registrada

                                <br />

                                <small>
                                  {formatearHora(
                                    registro.salida
                                  )}
                                </small>

                              </span>

                            ) : registro.entrada ? (

                              <span className="estado-asistencia pendiente">
                                🟡 Salida pendiente
                              </span>

                            ) : (

                              <span className="estado-asistencia pendiente">
                                ⏳ Sin registrar
                              </span>

                            )}

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </>

      )}

    </div>
  );
}

/* =====================================================
   APLICACIÓN PRINCIPAL
===================================================== */

function App() {
  /* ===================================================
     PANTALLA DE BIENVENIDA
  =================================================== */

  const [mostrarAdministracion, setMostrarAdministracion] =
    useState(false);

  /* ===================================================
     SECCIONES
  =================================================== */

  const [seccion, setSeccion] = useState("docente");

  const [personal, setPersonal] = useState([]);
  const [materias, setMaterias] = useState([]);

  /* ===================================================
     FORMULARIO PERSONAL
  =================================================== */

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [editando, setEditando] = useState(null);

  const [mensaje, setMensaje] = useState("");

  const [formulario, setFormulario] =
    useState(formularioVacio);

  /* ===================================================
     ASIGNACIÓN DE MATERIAS
  =================================================== */

  const [docenteSeleccionado, setDocenteSeleccionado] =
    useState(null);

  const [asignaciones, setAsignaciones] = useState([]);

  const [materiaSeleccionada, setMateriaSeleccionada] =
    useState("");

  const [diaSeleccionado, setDiaSeleccionado] =
    useState("Lunes");

  const [cargandoAsignaciones, setCargandoAsignaciones] =
    useState(false);

  /* ===================================================
     FORMULARIO MATERIAS
  =================================================== */

  const [
    mostrarMateriaFormulario,
    setMostrarMateriaFormulario,
  ] = useState(false);

  const [nombreMateria, setNombreMateria] =
    useState("");

  /* ===================================================
     VARIABLES DE SECCIÓN
  =================================================== */

  const esDocente = seccion === "docente";

  const esMaterias = seccion === "materias";

  const esAsistencias = seccion === "asistencias";

  /* ===================================================
     CARGAR PERSONAL
  =================================================== */

  const cargarPersonal = async () => {
    try {
      const respuesta = await fetch(
        `${API_URL}/usuarios/?tipo_empleado=${seccion}`
      );

      if (!respuesta.ok) {
        throw new Error(
          "No se pudo cargar el personal"
        );
      }

      const datos = await respuesta.json();

      setPersonal(datos);
    } catch (error) {
      console.error(error);

      setMensaje(
        "❌ No se pudo cargar el personal."
      );
    }
  };

  /* ===================================================
     CARGAR MATERIAS
  =================================================== */

  const cargarMaterias = async () => {
    try {
      const respuesta = await fetch(
        `${API_URL}/materias/`
      );

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron cargar las materias"
        );
      }

      const datos = await respuesta.json();

      setMaterias(datos);
    } catch (error) {
      console.error(error);

      setMensaje(
        "❌ No se pudieron cargar las materias."
      );
    }
  };

  /* ===================================================
     CUANDO CAMBIA LA SECCIÓN
  =================================================== */

useEffect(() => {
  if (
    seccion === "materias" ||
    seccion === "asistencias"
  ) {
    return;
  }

  const iniciarCarga = setTimeout(() => {
    cargarPersonal();
  }, 0);

  return () => {
    clearTimeout(iniciarCarga);
  };
}, [seccion]);
  /* ===================================================
     CARGAR MATERIAS AL INICIAR
  =================================================== */

useEffect(() => {
  const iniciarCarga = setTimeout(() => {
    cargarMaterias();
  }, 0);

  return () => {
    clearTimeout(iniciarCarga);
  };

// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* ===================================================
     CAMBIAR SECCIÓN
  =================================================== */

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);

    setMostrarFormulario(false);

    setMostrarMateriaFormulario(false);

    setEditando(null);

    setDocenteSeleccionado(null);

    setAsignaciones([]);

    setMensaje("");
  };

  /* ===================================================
     CAMBIO DE INPUT
  =================================================== */

  const manejarCambio = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  /* ===================================================
     NUEVO PERSONAL
  =================================================== */

  const nuevoPersonal = () => {
    setEditando(null);

    setFormulario(formularioVacio);

    setMensaje("");

    setMostrarFormulario(true);
  };

  /* ===================================================
     EDITAR PERSONAL
  =================================================== */

  const editarPersonal = (persona) => {
    setEditando(persona);

    setFormulario({
      nombre: persona.nombre || "",
      apellido: persona.apellido || "",
      usuario: persona.usuario || "",
      contrasenia: "",
    });

    setMensaje("");
    setMostrarFormulario(true);
  };

  /* ===================================================
     GUARDAR PERSONAL
  =================================================== */

  const guardarPersonal = async (e) => {
    e.preventDefault();

    if (
      !formulario.nombre.trim() ||
      !formulario.apellido.trim()
    ) {
      setMensaje("⚠️ Nombre y apellido son obligatorios.");
      return;
    }

    try {
      let respuesta;

      /* ---------------------------------------------
         EDITAR
      --------------------------------------------- */

      if (editando) {
        const datosActualizar = {
          nombre: formulario.nombre.trim(),
          apellido: formulario.apellido.trim(),
          tipo_empleado: seccion,
        };

        // Solo modifica el usuario si se escribió uno.
        if (formulario.usuario.trim()) {
          datosActualizar.usuario = formulario.usuario.trim();
        }

        // Solo modifica la contraseña si se escribió una nueva.
        if (formulario.contrasenia.trim()) {
          datosActualizar.contrasenia = formulario.contrasenia;
        }

        respuesta = await fetch(
          `${API_URL}/usuarios/${editando.id_usuario}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosActualizar),
          }
        );
      }

      /* ---------------------------------------------
         CREAR
      --------------------------------------------- */

      else {
        if (
          !formulario.usuario.trim() ||
          !formulario.contrasenia.trim()
        ) {
          setMensaje(
            "⚠️ Usuario y contraseña son obligatorios."
          );
          return;
        }

        respuesta = await fetch(
          `${API_URL}/usuarios/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nombre: formulario.nombre.trim(),
              apellido: formulario.apellido.trim(),
              usuario: formulario.usuario.trim(),
              contrasenia: formulario.contrasenia,
              tipo_empleado: seccion,
            }),
          }
        );
      }

      const datos = await respuesta
        .json()
        .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail || "Error al guardar"
        );
      }

      setMensaje(
        editando
          ? "✅ Personal actualizado correctamente."
          : "✅ Personal creado correctamente."
      );

      setMostrarFormulario(false);
      setEditando(null);
      setFormulario(formularioVacio);

      await cargarPersonal();
    } catch (error) {
      console.error(error);
      setMensaje(`❌ ${error.message}`);
    }
  };

  /* ===================================================
     ELIMINAR PERSONAL
  =================================================== */

  const eliminarPersonal = async (id) => {
    const confirmar = window.confirm(
      `¿Seguro que querés eliminar este ${
        esDocente
          ? "docente"
          : "no docente"
      }?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_URL}/usuarios/${id}`,
        {
          method: "DELETE",
        }
      );

      const datos =
        await respuesta
          .json()
          .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail ||
            "No se pudo eliminar"
        );
      }

      setMensaje(
        "✅ Personal eliminado correctamente."
      );

      if (
        docenteSeleccionado?.id_usuario === id
      ) {
        setDocenteSeleccionado(null);
      }

      await cargarPersonal();
    } catch (error) {
      console.error(error);

      setMensaje(
        `❌ ${error.message}`
      );
    }
  };

  /* ===================================================
     CARGAR ASIGNACIONES
  =================================================== */

  const cargarAsignaciones = async (
    idUsuario
  ) => {
    try {
      setCargandoAsignaciones(true);

      const respuesta = await fetch(
        `${API_URL}/docente-materia/?id_usuario=${idUsuario}`
      );

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron cargar las asignaciones"
        );
      }

      const datos =
        await respuesta.json();

      setAsignaciones(datos);
    } catch (error) {
      console.error(error);

      setAsignaciones([]);

      setMensaje(
        "❌ No se pudieron cargar las materias del docente."
      );
    } finally {
      setCargandoAsignaciones(false);
    }
  };

  /* ===================================================
     ABRIR MATERIAS DE DOCENTE
  =================================================== */

  const abrirMaterias = async (
    docente
  ) => {
    setDocenteSeleccionado(docente);

    setMateriaSeleccionada("");

    setDiaSeleccionado("Lunes");

    setMensaje("");

    await cargarMaterias();

    await cargarAsignaciones(
      docente.id_usuario
    );
  };

  /* ===================================================
     CERRAR MATERIAS
  =================================================== */

  const cerrarMaterias = () => {
    setDocenteSeleccionado(null);

    setAsignaciones([]);

    setMateriaSeleccionada("");

    setDiaSeleccionado("Lunes");
  };

  /* ===================================================
     ASIGNAR MATERIA
  =================================================== */

  const asignarMateria = async (e) => {
    e.preventDefault();

    if (!materiaSeleccionada) {
      setMensaje(
        "⚠️ Seleccioná una materia."
      );

      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/docente-materia/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id_usuario:
              docenteSeleccionado.id_usuario,

            id_materia:
              Number(materiaSeleccionada),

            dia_semana:
              diaSeleccionado,
          }),
        }
      );

      const datos =
        await respuesta
          .json()
          .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail ||
            "No se pudo asignar la materia"
        );
      }

      setMensaje(
        "✅ Materia asignada correctamente."
      );

      setMateriaSeleccionada("");

      await cargarAsignaciones(
        docenteSeleccionado.id_usuario
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        `❌ ${error.message}`
      );
    }
  };

  /* ===================================================
     ELIMINAR ASIGNACIÓN
  =================================================== */

  const eliminarAsignacion = async (
    idAsignacion
  ) => {
    const confirmar = window.confirm(
      "¿Seguro que querés quitar esta materia del docente?"
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_URL}/docente-materia/${idAsignacion}`,
        {
          method: "DELETE",
        }
      );

      const datos =
        await respuesta
          .json()
          .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail ||
            "No se pudo quitar la asignación"
        );
      }

      setMensaje(
        "✅ Asignación eliminada correctamente."
      );

      await cargarAsignaciones(
        docenteSeleccionado.id_usuario
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        `❌ ${error.message}`
      );
    }
  };

  /* ===================================================
     NOMBRE DE MATERIA
  =================================================== */

  const obtenerNombreMateria = (
    idMateria
  ) => {
    const materia = materias.find(
      (item) =>
        item.id_materia === idMateria
    );

    return (
      materia?.nombre_materia ||
      `Materia #${idMateria}`
    );
  };

  /* ===================================================
     CREAR MATERIA
  =================================================== */

  const crearMateria = async (e) => {
    e.preventDefault();

    if (!nombreMateria.trim()) {
      setMensaje(
        "⚠️ Escribí el nombre de la materia."
      );

      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/materias/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            nombre_materia:
              nombreMateria.trim(),
          }),
        }
      );

      const datos =
        await respuesta
          .json()
          .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail ||
            "No se pudo crear la materia"
        );
      }

      setMensaje(
        "✅ Materia creada correctamente."
      );

      setNombreMateria("");

      setMostrarMateriaFormulario(false);

      await cargarMaterias();
    } catch (error) {
      console.error(error);

      setMensaje(
        `❌ ${error.message}`
      );
    }
  };

  /* ===================================================
     ELIMINAR MATERIA
  =================================================== */

  const eliminarMateria = async (
    materia
  ) => {
    const confirmar = window.confirm(
      `¿Seguro que querés eliminar "${materia.nombre_materia}"?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_URL}/materias/${materia.id_materia}`,
        {
          method: "DELETE",
        }
      );

      const datos =
        await respuesta
          .json()
          .catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          datos?.detail ||
            "No se pudo eliminar la materia"
        );
      }

      setMensaje(
        "✅ Materia eliminada correctamente."
      );

      await cargarMaterias();
    } catch (error) {
      console.error(error);

      setMensaje(
        `❌ ${error.message}`
      );
    }
  };

  /* ===================================================
     PANTALLA
  =================================================== */

  return (
    <>
      {/* =============================================
          BIENVENIDA
      ============================================= */}

      {!mostrarAdministracion ? (
        <div className="pantalla-bienvenida-admin">
          <div className="bienvenida-admin-card">

            <div className="icono-admin">
              🏫
            </div>

            <h1>
              ¡Buenos días!
            </h1>

            <p>
              Bienvenido al sistema de administración
            </p>

            <button
              className="btn-ingresar-admin"
              onClick={() =>
                setMostrarAdministracion(true)
              }
            >
              Ingresar →
            </button>

          </div>
        </div>
      ) : (

        /* ===========================================
           ADMINISTRACIÓN
        =========================================== */

        <div className="administracion">

          {/* =========================================
              ENCABEZADO
          ========================================= */}

          <header className="encabezado">

            <div>
              <h1>
                Administración
              </h1>

              <p>
                Gestión de personal, materias y asistencias
              </p>
            </div>

            {/* BOTÓN NUEVO PERSONAL */}

            {!esMaterias &&
              !esAsistencias && (
                <button
                  className="btn-nuevo"
                  onClick={nuevoPersonal}
                >
                  + Nuevo{" "}
                  {esDocente
                    ? "docente"
                    : "no docente"}
                </button>
              )}

            {/* BOTÓN NUEVA MATERIA */}

            {esMaterias && (
              <button
                className="btn-nuevo"
                onClick={() => {
                  setNombreMateria("");
                  setMensaje("");
                  setMostrarMateriaFormulario(
                    true
                  );
                }}
              >
                + Nueva materia
              </button>
            )}

          </header>

          {/* =========================================
              MENÚ
          ========================================= */}

          <nav className="menu-personal">

            <button
              className={
                esDocente
                  ? "activo"
                  : ""
              }
              onClick={() =>
                cambiarSeccion(
                  "docente"
                )
              }
            >
              👩‍🏫 Docentes
            </button>

            <button
              className={
                seccion ===
                "no_docente"
                  ? "activo"
                  : ""
              }
              onClick={() =>
                cambiarSeccion(
                  "no_docente"
                )
              }
            >
              👷 No docentes
            </button>

            <button
              className={
                esMaterias
                  ? "activo"
                  : ""
              }
              onClick={() =>
                cambiarSeccion(
                  "materias"
                )
              }
            >
              📚 Materias
            </button>

            <button
              className={
                esAsistencias
                  ? "activo"
                  : ""
              }
              onClick={() =>
                cambiarSeccion(
                  "asistencias"
                )
              }
            >
              📋 Asistencias
            </button>

          </nav>

          {/* =========================================
              MENSAJE
          ========================================= */}

          {mensaje && (
            <div className="mensaje">
              {mensaje}
            </div>
          )}

          {/* =========================================
              CONTENIDO
          ========================================= */}

          <main className="contenido">

            {/* =======================================
                DOCENTES / NO DOCENTES
            ======================================= */}

            {!esMaterias &&
              !esAsistencias && (
                <div className="tabla-contenedor">

                 <h2>
  {esDocente
    ? "👩‍🏫 Docentes registrados"
    : "👷 Personal no docente"}
</h2>

                  {personal.length ===
                  0 ? (
                    <p className="sin-datos">
                      No hay{" "}
                      {esDocente
                        ? "docentes"
                        : "no docentes"}{" "}
                      registrados.
                    </p>
                  ) : (

                    <div className="tabla-scroll">

                      <table>

                        <thead>
                          <tr>
                            <th>
                              Identificación
                            </th>

                            <th>
                              Nombre
                            </th>

                            <th>
                              Apellido
                            </th>

                            <th>
                              Tipo
                            </th>

                            <th>
                              Acciones
                            </th>
                          </tr>
                        </thead>

                        <tbody>

                          {personal.map(
                            (persona) => (
                              <tr
                                key={
                                  persona.id_usuario
                                }
                              >

                                <td>
                                  {
                                    persona.id_usuario
                                  }
                                </td>

                                <td>
                                  {
                                    persona.nombre
                                  }
                                </td>

                                <td>
                                  {
                                    persona.apellido
                                  }
                                </td>

                               <td>
  {persona.tipo_empleado === "no_docente"
    ? "No docente"
    : "Docente"}
</td>

                                <td className="acciones">

                                  <button
                                    className="btn-editar"
                                    onClick={() =>
                                      editarPersonal(
                                        persona
                                      )
                                    }
                                  >
                                    Editar
                                  </button>

                                  {esDocente && (
                                    <button
                                      className="btn-materias"
                                      onClick={() =>
                                        abrirMaterias(
                                          persona
                                        )
                                      }
                                    >
                                      📚 Materias
                                    </button>
                                  )}

                                  <button
                                    className="btn-eliminar"
                                    onClick={() =>
                                      eliminarPersonal(
                                        persona.id_usuario
                                      )
                                    }
                                  >
                                    Eliminar
                                  </button>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  )}

                </div>
            )}

            {/* =======================================
                MATERIAS
            ======================================= */}

            {esMaterias && (
              <div className="tabla-contenedor">

                <h2>
                  Materias registradas
                </h2>

                {materias.length ===
                0 ? (
                  <p className="sin-datos">
                    No hay materias registradas.
                  </p>
                ) : (

                  <div className="tabla-scroll">

                    <table>

                      <thead>
                        <tr>
                          <th>
                            Identificación
                          </th>

                          <th>
                            Materia
                          </th>

                          <th>
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {materias.map(
                          (materia) => (
                            <tr
                              key={
                                materia.id_materia
                              }
                            >

                              <td>
                                {
                                  materia.id_materia
                                }
                              </td>

                              <td>
                                {
                                  materia.nombre_materia
                                }
                              </td>

                              <td className="acciones">

                                <button
                                  className="btn-eliminar"
                                  onClick={() =>
                                    eliminarMateria(
                                      materia
                                    )
                                  }
                                >
                                  Eliminar
                                </button>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </div>
            )}

            {/* =======================================
                ASISTENCIAS
            ======================================= */}

            {esAsistencias && (
              <PantallaAsistencias />
            )}

            {/* =======================================
                FORMULARIO PERSONAL
            ======================================= */}

            {mostrarFormulario && (
              <div className="formulario-contenedor">

                <h2>
                  {editando
                    ? `Editar ${
                        esDocente
                          ? "docente"
                          : "no docente"
                      }`
                    : `Nuevo ${
                        esDocente
                          ? "docente"
                          : "no docente"
                      }`}
                </h2>

                <form
                  onSubmit={
                    guardarPersonal
                  }
                >

                  <label>
                    Nombre
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    value={
                      formulario.nombre
                    }
                    onChange={
                      manejarCambio
                    }
                    required
                  />

                  <label>
                    Apellido
                  </label>

                  <input
                    type="text"
                    name="apellido"
                    value={
                      formulario.apellido
                    }
                    onChange={
                      manejarCambio
                    }
                    required
                  />

                  <>
                  <label>
                    Usuario
                  </label>

                  <input
                    type="text"
                    name="usuario"
                    value={formulario.usuario}
                    onChange={manejarCambio}
                    required
                  />

                  <label>
                    {editando
                      ? "Nueva contraseña"
                      : "Contraseña"}
                  </label>

                  <input
                    type="password"
                    name="contrasenia"
                    value={formulario.contrasenia}
                    onChange={manejarCambio}
                    required={!editando}
                    placeholder={
                      editando
                        ? "Dejar vacío para conservar la actual"
                        : ""
                    }
                  />
                </>

                  <div className="botones-formulario">

                    <button
                      type="button"
                      className="btn-cancelar"
                      onClick={() =>
                        setMostrarFormulario(
                          false
                        )
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn-guardar"
                    >
                      {editando
                        ? "Guardar cambios"
                        : `Crear ${
                            esDocente
                              ? "docente"
                              : "no docente"
                          }`}
                    </button>

                  </div>

                </form>

              </div>
            )}

            {/* =======================================
                NUEVA MATERIA
            ======================================= */}

            {mostrarMateriaFormulario &&
              esMaterias && (
                <div className="formulario-contenedor">

                  <h2>
                    Nueva materia
                  </h2>

                  <form
                    onSubmit={
                      crearMateria
                    }
                  >

                    <label>
                      Nombre de la materia
                    </label>

                    <input
                      type="text"
                      value={
                        nombreMateria
                      }
                      onChange={(e) =>
                        setNombreMateria(
                          e.target.value
                        )
                      }
                      placeholder="Ej. Programación"
                      required
                    />

                    <div className="botones-formulario">

                      <button
                        type="button"
                        className="btn-cancelar"
                        onClick={() =>
                          setMostrarMateriaFormulario(
                            false
                          )
                        }
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className="btn-guardar"
                      >
                        Crear materia
                      </button>

                    </div>

                  </form>

                </div>
            )}

            {/* =======================================
                ASIGNAR MATERIAS A DOCENTE
            ======================================= */}

            {docenteSeleccionado && (
              <section className="asignaciones-contenedor">

                <div className="asignaciones-cabecera">

                  <div>

                    <h2>
                      Asignar materias
                    </h2>

                    <p>
                      Docente:{" "}
                      <strong>
                        {
                          docenteSeleccionado.nombre
                        }{" "}
                        {
                          docenteSeleccionado.apellido
                        }
                      </strong>
                    </p>

                  </div>

                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={
                      cerrarMaterias
                    }
                  >
                    Cerrar
                  </button>

                </div>

                <form
                  className="form-asignacion"
                  onSubmit={
                    asignarMateria
                  }
                >

                  <div className="campo-asignacion">

                    <label>
                      Materia
                    </label>

                    <select
                      value={
                        materiaSeleccionada
                      }
                      onChange={(e) =>
                        setMateriaSeleccionada(
                          e.target.value
                        )
                      }
                      required
                    >

                      <option value="">
                        Seleccionar materia...
                      </option>

                      {materias.map(
                        (materia) => (
                          <option
                            key={
                              materia.id_materia
                            }
                            value={
                              materia.id_materia
                            }
                          >
                            {
                              materia.nombre_materia
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div className="campo-asignacion">

                    <label>
                      Día
                    </label>

                    <select
                      value={
                        diaSeleccionado
                      }
                      onChange={(e) =>
                        setDiaSeleccionado(
                          e.target.value
                        )
                      }
                    >

                      {DIAS.map(
                        (dia) => (
                          <option
                            key={dia}
                            value={dia}
                          >
                            {dia}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <button
                    type="submit"
                    className="btn-guardar"
                  >
                    + Asignar materia
                  </button>

                </form>

                <div className="lista-asignaciones">

                  <h3>
                    Materias asignadas
                  </h3>

                  {cargandoAsignaciones ? (
                    <p>
                      Cargando asignaciones...
                    </p>
                  ) : asignaciones.length ===
                    0 ? (

                    <p className="sin-datos">
                      Este docente todavía no
                      tiene materias asignadas.
                    </p>

                  ) : (

                    <div className="asignaciones-grid">

                      {asignaciones.map(
                        (asignacion) => (

                          <div
                            className="asignacion-item"
                            key={
                              asignacion.id_docente_materia
                            }
                          >

                            <div>

                              <strong>
                                {obtenerNombreMateria(
                                  asignacion.id_materia
                                )}
                              </strong>

                              <span>
                                {
                                  asignacion.dia_semana
                                }
                              </span>

                            </div>

                            <button
                              type="button"
                              className="btn-eliminar"
                              onClick={() =>
                                eliminarAsignacion(
                                  asignacion.id_docente_materia
                                )
                              }
                            >
                              Quitar
                            </button>

                          </div>

                        )
                      )}

                    </div>
                  )}

                </div>

              </section>
            )}

          </main>

        </div>
      )}
    </>
  );
}

export default App;
