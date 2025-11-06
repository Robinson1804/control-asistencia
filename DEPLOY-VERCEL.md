# 🚀 GUÍA DE DEPLOY EN VERCEL

## 📋 ARCHIVOS CREADOS PARA VERCEL

Se han creado los siguientes archivos para el despliegue:

- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.vercelignore` - Archivos a ignorar
- ✅ `server.js` - Modificado para exportar la app

---

## 🔧 PASO 1: INSTALAR VERCEL CLI

Abre tu terminal y ejecuta:

```bash
npm install -g vercel
```

---

## 🌐 PASO 2: INICIAR SESIÓN EN VERCEL

```bash
vercel login
```

Esto abrirá tu navegador para que inicies sesión con tu cuenta de GitHub.

---

## 📦 PASO 3: CONFIGURAR VARIABLES DE ENTORNO

Antes de hacer deploy, necesitas configurar las variables de entorno en Vercel:

### Opción A: Desde la línea de comandos

```bash
# En la carpeta del proyecto
vercel env add SUPABASE_URL
# Pega tu URL de Supabase cuando te lo pida

vercel env add SUPABASE_KEY
# Pega tu Service Role Key cuando te lo pida

vercel env add JWT_SECRET
# Pega tu secreto JWT cuando te lo pida

vercel env add PORT
# Escribe: 3000

vercel env add NODE_ENV
# Escribe: production
```

### Opción B: Desde el Dashboard de Vercel (Recomendado)

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto (después del primer deploy)
3. Ve a "Settings" → "Environment Variables"
4. Agrega las siguientes variables:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `SUPABASE_URL` | Tu URL de Supabase | https://pcogwaqagqekwrtqqnye.supabase.co |
| `SUPABASE_KEY` | Tu Service Role Key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| `JWT_SECRET` | Tu secreto JWT | mi_secreto_super_seguro_12345 |
| `PORT` | 3000 | 3000 |
| `NODE_ENV` | production | production |

---

## 🚀 PASO 4: HACER DEPLOY

### Deploy desde la línea de comandos:

```bash
# En la carpeta del proyecto
cd C:\Users\david\Documents\VSCODEE\control-asistencia

# Deploy a producción
vercel --prod
```

### Responde a las preguntas:

```
? Set up and deploy "control-asistencia"? [Y/n] → Y
? Which scope do you want to deploy to? → Tu usuario
? Link to existing project? [y/N] → N
? What's your project's name? → control-asistencia
? In which directory is your code located? → ./
```

---

## 🌐 PASO 5: CONFIGURAR DOMINIO (Opcional)

Después del deploy, Vercel te dará una URL como:
```
https://control-asistencia.vercel.app
```

Si quieres un dominio personalizado:
1. Ve al dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a "Settings" → "Domains"
4. Agrega tu dominio personalizado

---

## 📝 COMANDOS ÚTILES DE VERCEL

```bash
# Ver tus deployments
vercel ls

# Ver logs del último deployment
vercel logs

# Ver información del proyecto
vercel inspect

# Deploy a preview (no producción)
vercel

# Deploy a producción
vercel --prod

# Eliminar un deployment
vercel rm [deployment-url]
```

---

## 🔍 VERIFICAR QUE TODO FUNCIONA

Después del deploy, verifica:

1. **Backend API:**
   ```
   https://tu-proyecto.vercel.app/api/health
   ```
   Debería retornar: `{"success":true,"message":"Servidor funcionando correctamente"}`

2. **Página principal:**
   ```
   https://tu-proyecto.vercel.app/
   ```
   Debería mostrar la página de inicio

3. **Login:**
   ```
   https://tu-proyecto.vercel.app/login.html
   ```
   Usuario: admin / Contraseña: admin123

4. **Dashboard:**
   ```
   https://tu-proyecto.vercel.app/dashboard.html
   ```

5. **Kiosko:**
   ```
   https://tu-proyecto.vercel.app/kiosko.html
   ```

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Module not found"
**Solución**: Asegúrate de que todas las dependencias estén en `package.json`:
```bash
npm install
```

### Error: "Environment variables not found"
**Solución**: Configura las variables de entorno en el dashboard de Vercel (Settings → Environment Variables)

### Error: "Cannot connect to database"
**Solución**:
1. Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén correctos
2. Asegúrate de que la IP de Vercel pueda acceder a Supabase (generalmente ya está permitido)

### Error 404 en rutas
**Solución**: Verifica que `vercel.json` esté correctamente configurado

---

## 🔄 ACTUALIZAR EL DEPLOY

Cuando hagas cambios en el código:

```bash
# 1. Commit los cambios
git add .
git commit -m "Descripción de cambios"
git push origin main

# 2. Deploy a Vercel
vercel --prod
```

O si conectaste GitHub con Vercel, los deploys se harán automáticamente al hacer push.

---

## 🔗 CONECTAR GITHUB CON VERCEL (Recomendado)

1. Ve a https://vercel.com/dashboard
2. Click en "Add New..." → "Project"
3. Importa tu repositorio de GitHub: `Robinson1804/control-asistencia`
4. Configura las variables de entorno
5. Click en "Deploy"

**Ventaja**: Cada vez que hagas push a GitHub, Vercel desplegará automáticamente.

---

## 📊 MONITOREO

### Ver Analytics:
1. Dashboard de Vercel → Tu proyecto → "Analytics"

### Ver Logs en tiempo real:
```bash
vercel logs --follow
```

### Ver uso de recursos:
Dashboard de Vercel → Tu proyecto → "Usage"

---

## 🎯 CHECKLIST DE DEPLOY

Antes de hacer deploy, verifica:

- [ ] `vercel.json` creado
- [ ] `.vercelignore` creado
- [ ] `server.js` exporta la app
- [ ] Variables de entorno configuradas en Vercel
- [ ] `package.json` tiene todas las dependencias
- [ ] `.env` NO está en el repositorio
- [ ] Probado localmente con `npm start`

---

## 🔐 SEGURIDAD

### Variables de entorno:
- ✅ **NUNCA** hacer commit de `.env`
- ✅ Usar variables de entorno en Vercel
- ✅ Rotar el `JWT_SECRET` en producción
- ✅ Verificar que `SUPABASE_KEY` sea el Service Role Key

### CORS:
Si necesitas configurar CORS específico, edita en `server.js`:
```javascript
app.use(cors({
  origin: 'https://tu-dominio.vercel.app',
  credentials: true
}));
```

---

## 🆘 SOPORTE

Si tienes problemas:
1. Revisa los logs: `vercel logs`
2. Verifica las variables de entorno en el dashboard
3. Consulta la documentación: https://vercel.com/docs

---

## ✅ RESULTADO ESPERADO

Después del deploy exitoso:

- ✅ URL: `https://control-asistencia.vercel.app` (o similar)
- ✅ Sistema de login funcionando
- ✅ Registro manual operativo
- ✅ Kiosko accesible
- ✅ Dashboard con reportes
- ✅ Conexión a Supabase activa
- ✅ Variables de entorno configuradas

---

## 📱 URLS DEL SISTEMA EN PRODUCCIÓN

Una vez desplegado:

- **Inicio**: https://tu-proyecto.vercel.app/
- **Login**: https://tu-proyecto.vercel.app/login.html
- **Registro Manual**: https://tu-proyecto.vercel.app/registro-manual.html
- **Kiosko**: https://tu-proyecto.vercel.app/kiosko.html
- **Dashboard**: https://tu-proyecto.vercel.app/dashboard.html
- **API Health**: https://tu-proyecto.vercel.app/api/health

---

**¡Listo para desplegar en Vercel!** 🚀

Ejecuta: `vercel --prod`
