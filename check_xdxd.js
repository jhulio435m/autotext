import { appPool } from './server/db.js';

async function check() {
  try {
    const { rows } = await appPool.query(
      "SELECT * FROM app_project_variables WHERE variable_key = 'xdxd'"
    );
    if (rows.length > 0) {
      console.log('✅ LA VARIABLE xdxd EXISTE EN LA DB:');
      console.log(JSON.stringify(rows, null, 2));
    } else {
      console.log('❌ LA VARIABLE xdxd NO EXISTE EN LA DB.');
      
      const lastVars = await appPool.query("SELECT * FROM app_project_variables ORDER BY updated_at DESC LIMIT 5");
      console.log('Últimas 5 variables guardadas en el sistema:');
      console.log(JSON.stringify(lastVars.rows, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
