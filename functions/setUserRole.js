/**
 * Cloud Function para definir custom claims de usuário
 * 
 * Uso via Firebase Functions Shell:
 * firebase functions:shell
 * setUserRole('user@email.com', 'sad')
 * 
 * Ou via script Node.js direto:
 * node functions/setUserRole.js user@email.com sad
 */

const admin = require('firebase-admin');

// Inicializar Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Define o papel (role) de um usuário via custom claims
 * @param {string} email - Email do usuário
 * @param {string} role - Papel do usuário ('pm' | 'sad')
 */
async function setUserRole(email, role) {
  try {
    // Validar role
    if (!['pm', 'sad'].includes(role)) {
      throw new Error('Role deve ser "pm" ou "sad"');
    }

    // Buscar usuário pelo email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Definir custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    
    console.log(`✅ Role "${role}" definido para o usuário ${email} (${userRecord.uid})`);
    
    return {
      success: true,
      message: `Role "${role}" definido para ${email}`,
      uid: userRecord.uid
    };
    
  } catch (error) {
    console.error('❌ Erro ao definir role:', error.message);
    throw error;
  }
}

// Se executado diretamente via Node.js
if (require.main === module) {
  const [,, email, role] = process.argv;
  
  if (!email || !role) {
    console.error('Uso: node setUserRole.js <email> <role>');
    console.error('Exemplo: node setUserRole.js user@email.com sad');
    process.exit(1);
  }
  
  setUserRole(email, role)
    .then((result) => {
      console.log('Resultado:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro:', error.message);
      process.exit(1);
    });
}

// Export para uso via Functions Shell ou HTTP trigger
module.exports = { setUserRole };

/**
 * HTTP Cloud Function (opcional)
 * POST /setUserRole
 * Body: { email: "user@email.com", role: "sad" }
 */
exports.setUserRoleHttp = async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ 
        error: 'Email e role são obrigatórios' 
      });
    }
    
    // Verificar autenticação (opcional - implementar conforme necessário)
    // const token = req.headers.authorization?.split('Bearer ')[1];
    // await admin.auth().verifyIdToken(token);
    
    const result = await setUserRole(email, role);
    res.json(result);
    
  } catch (error) {
    console.error('Erro na função HTTP:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
};