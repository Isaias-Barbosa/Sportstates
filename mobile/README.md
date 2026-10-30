# 📱 Sportstates Mobile

Aplicativo mobile oficial do **Sportstates**, construído com **React Native + Expo** e TypeScript.

---

## ✨ Recursos

- ⚡ **Card Ao Vivo em Destaque Gigante**: O jogo ao vivo ganha destaque especial no topo com contorno e badge vermelhos pulsantes para pregar a atenção imediata do torcedor.
- 🔴 **Aba Ao Vivo**: Radar em tempo real com atualização contínua dos lances e placares.
- ⚽ **Multiesportes**: Futebol, Basquete, Futebol Americano, Beisebol, Hóquei e mais.
- ⭐ **Favoritos**: Salve suas partidas para acesso rápido.
- 🔄 **Mercado da Bola**: Movimentações e transferências integradas via Transfermarkt.
- 🎨 **Tema Dark Moderno**: Paleta otimizada em OLED (`#0d1310`), verde neon (`#22c55e`) e vermelho alerta (`#ef4444`).

---

## 🚀 Como Rodar no Celular (Em 1 Minuto)

Você pode testar diretamente no seu smartphone sem precisar configurar Android Studio ou Xcode!

### 1. Pré-requisitos no Celular
- Baixe o aplicativo **Expo Go** na [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779).

### 2. Iniciar o Projeto
Abra o terminal na pasta `mobile/`:

```bash
cd mobile
npm install
npm start
```

### 3. Conectar
- No **Android**: Abra o app *Expo Go* e escaneie o QR Code que apareceu no seu terminal.
- No **iPhone**: Abra a câmera nativa do iOS, aponte para o QR Code e toque no banner para abrir no *Expo Go*.

---

## 🌐 Configuração da API

Por padrão, o app conecta na API de produção:
```typescript
// mobile/src/api.ts
export const API_BASE_URL = "https://sportstates.vercel.app";
```

Se estiver testando o servidor backend localmente na sua máquina, altere para o IP da sua rede local (ex: `http://192.168.1.100:3000`).

