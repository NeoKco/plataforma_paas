# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]: Platform PaaS
  - generic [ref=e6]:
    - generic [ref=e7]:
      - img [ref=e9]
      - heading "Portal Tenant" [level=1] [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]: Idioma
      - combobox "Idioma" [ref=e15]:
        - option "Español" [selected]
        - option "English"
  - paragraph [ref=e16]: Inicia sesión para revisar el estado de tu tenant, su plan, límites y módulos habilitados.
  - generic [ref=e17]:
    - generic [ref=e18]: ¿Necesitas entrar a la operación de plataforma?
    - link "Abrir Admin Plataforma" [ref=e20] [cursor=pointer]:
      - /url: /login
  - generic [ref=e21]: Debes iniciar sesión tenant para continuar.
  - generic [ref=e22]:
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]: Código de tu espacio
        - 'button "Ayuda: Código de tu espacio" [ref=e26] [cursor=pointer]': "?"
      - 'textbox "Ej: empresa-demo" [ref=e27]'
    - generic [ref=e28]:
      - generic [ref=e29]:
        - generic [ref=e30]: Usuario
        - 'button "Ayuda: Usuario" [ref=e31] [cursor=pointer]': "?"
      - 'textbox "Ej: admin@empresa-demo.local" [ref=e32]'
    - generic [ref=e33]:
      - generic [ref=e34]: Contraseña
      - textbox [ref=e35]
    - button "Ingresar" [ref=e37] [cursor=pointer]
```