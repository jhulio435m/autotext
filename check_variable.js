import { appPool } from './server/db.js';

async function check() {
  try {
    const { rows } = await appPool.query(
      "SELECT project_id, variable_key, variable_value, variable_type FROM app_project_variables WHERE variable_key = 'xd'"
    );
    if (rows.length > 0) {
      console.log('✅ LA VARIABLE EXISTE EN LA DB:');
      console.log(JSON.stringify(rows, null, 2));
    } else {
      console.log('❌ LA VARIABLE NO EXISTE EN LA DB.');
      const allRes = await appPool.query("SELECT variable_key FROM app_project_variables LIMIT 5");
      console.log('Otras variables presentes:', allRes.rows.map(r => r.variable_key));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
