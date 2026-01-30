const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { findByEmail, resetPassword } = require('../services/users.service');
const { comparePassword, hashPassword } = require('../utils/password');

const router = express.Router();

router.patch('/users/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const cp = String(currentPassword || '');
    const np = String(newPassword || '');

    if (np.length < 6) return res.status(400).json({ ok:false, message:'Contraseña nueva muy corta (mín 6)' });

    const me = await findByEmail(req.session.user.correo);
    if (!me) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const ok = await comparePassword(cp, me.password_hash);
    if (!ok) return res.status(401).json({ ok:false, message:'Contraseña actual incorrecta' });

    const password_hash = await hashPassword(np);
    await resetPassword(me.id_user, password_hash);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al cambiar contraseña' });
  }
});

module.exports = router;
