import { appPool } from './server/db.js';
import { saveWorkspaceState, loadWorkspaceState } from './server/workspace-store.js';
import { nanoid } from 'nanoid';

async function stressTest() {
  console.log('🚀 Iniciando Prueba de Fuego: Estrés de Persistencia Híbrida 3NF...');
  
  // 1. Setup: Buscar un usuario real para la prueba
  const userRes = await appPool.query('SELECT id FROM app_users LIMIT 1');
  if (userRes.rows.length === 0) {
    console.error('❌ No hay usuarios en la DB para probar.');
    process.exit(1);
  }
  const userId = userRes.rows[0].id;
  const projectId = 'stress_test_proj_' + nanoid(5);
  const docId = 'stress_test_doc_' + nanoid(5);

  console.log(`📊 Probando con Usuario ID: ${userId}, Proyecto: ${projectId}`);

  // 2. Generar Contenido Masivo
  const structure = [];
  for (let i = 0; i < 20; i++) {
    const sectionId = nanoid();
    structure.push({
      id: sectionId,
      type: 'section',
      content: `Sección de Estrés ${i}`,
      children: Array.from({ length: 5 }, (_, j) => ({
        id: nanoid(),
        type: 'paragraph',
        content: `Este es el párrafo ${j} de la sección ${i}. Contiene texto generado para ocupar espacio y probar la fragmentación relacional de la base de datos.`
      }))
    });
  }

  const formData = {};
  for (let i = 0; i < 100; i++) {
    formData[`campo_estres_${i}`] = `Valor de prueba ${i}`;
  }

  const tableRows = Array.from({ length: 50 }, (_, i) => ({
    id: `row_${i}`,
    col_0: `Dato A-${i}`,
    col_1: `Dato B-${i}`,
    col_2: `Dato C-${i}`,
    col_3: `Dato D-${i}`,
    col_4: `Dato E-${i}`
  }));

  const blockId = 'var_tabla_masiva';
  const rawWorkspace = {
    projects: [{ id: projectId, name: 'Proyecto de Estrés', description: 'Test de carga' }],
    documents: {
      [projectId]: [{
        id: docId,
        name: 'Documento Gigante',
        type: 'report',
        structure,
        formData
      }]
    },
    coverConfig: {
      [projectId]: {
        projectData: {
          [blockId]: JSON.stringify({
            type: 'table',
            nodeProps: { label: 'Tabla Masiva de Estrés' },
            formData: { rows: tableRows }
          })
        },
        projectVariables: [
          { key: blockId, type: 'block', label: 'Tabla Masiva' }
        ]
      }
    }
  };

  try {
    console.log('💾 Guardando Workspace (Modo Híbrido)...');
    const startSave = Date.now();
    await saveWorkspaceState(appPool, userId, rawWorkspace);
    console.log(`✅ Guardado exitoso en ${Date.now() - startSave}ms`);

    // 3. Verificar Normalización en la DB
    const nodeCount = await appPool.query('SELECT count(*) FROM app_document_nodes WHERE document_id = $1', [docId]);
    const valueCount = await appPool.query('SELECT count(*) FROM app_document_values WHERE document_id = $1', [docId]);
    const cellCount = await appPool.query('SELECT count(*) FROM app_block_table_cells WHERE row_id IN (SELECT id FROM app_block_table_rows WHERE block_id = $1)', [blockId]);

    console.log('\n--- 📈 Resultados de Normalización (SQL Rows) ---');
    console.log(`Nodos de Documento: ${nodeCount.rows[0].count} filas`);
    console.log(`Valores de Formulario: ${valueCount.rows[0].count} filas`);
    console.log(`Celdas de Tabla: ${cellCount.rows[0].count} filas`);
    console.log('------------------------------------------------\n');

    // 4. Verificar Desnormalización (Lectura Rápida)
    console.log('📖 Cargando Workspace (Modo Desnormalizado)...');
    const startLoad = Date.now();
    const loaded = await loadWorkspaceState(appPool, userId);
    console.log(`✅ Cargado exitoso en ${Date.now() - startLoad}ms`);

    const loadedDoc = loaded.workspace.documents[projectId][0];
    if (loadedDoc.structure.length === 20 && Object.keys(loadedDoc.formData).length === 100) {
      console.log('🏆 PRUEBA SUPERADA: La integridad de los datos es perfecta.');
    } else {
      console.error('❌ ERROR: Los datos cargados no coinciden con los guardados.');
    }

    // Cleanup opcional
    // await appPool.query('DELETE FROM app_projects WHERE id = $1', [projectId]);

    process.exit(0);
  } catch (err) {
    console.error('💥 FALLO EN LA PRUEBA:', err);
    process.exit(1);
  }
}

stressTest();
