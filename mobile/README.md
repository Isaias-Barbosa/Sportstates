# 📱 Sportstates Mobile

Aplicativo mobile oficial do **Sportstates**, construído com **React Native + Expo** e TypeScript.

---

## ✨ Recursos

- ⚡ **Destaque ao vivo**: Partidas em andamento aparecem no topo.
- 🔴 **Aba Ao Vivo**: Radar em tempo real com atualização contínua dos lances e placares.
- 🏒 **Detalhes da partida**: Toque em um jogo para ver o lance a lance e as estatísticas, incluindo períodos, gols, finalizações, penalidades e superioridade numérica no hóquei.
- 🛡️ **Times e classificação**: Acesse perfis de equipes, elencos, próximos jogos e tabelas pelo menu inferior.
- ⚡ **Esportes**: Filtros de modalidade com cartões ampliados para facilitar o toque.
- ⚽ **Multiesportes**: Futebol, basquete (NBA, WNBA e NBB), futebol americano, beisebol, hóquei e judô.
- 🥋 **Judô**: Disponível no catálogo; ainda sem fonte integrada de placares.
- ⭐ **Favoritos**: Salve suas partidas para acesso rápido.
- 🎨 **Tema Dark Moderno**: Paleta otimizada em OLED (`#0d1310`), verde neon (`#22c55e`) e vermelho alerta (`#ef4444`).

---

## 🚀 Como executar no celular

O app usa Expo SDK 58, React Native 0.88.1 e React 19.3.0. Use Node.js 22.13.0 ou mais recente (Node 24 recomendado) e uma versão do Expo Go compatível com SDK 58.

### 1. Preparar o aparelho

- Baixe o aplicativo **Expo Go** na [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779).
- Atualize o Expo Go pela loja se o QR Code indicar incompatibilidade de SDK.

### 2. Iniciar o projeto

No terminal, a partir da pasta `mobile/`:

```bash
npm ci
npm start
```

Se o aparelho e o computador não conseguirem se conectar pela rede local, use `npm run tunnel`. O túnel resolve problemas de conectividade; incompatibilidade de SDK exige atualizar o Expo Go.

### 3. Conectar

- No **Android**: Abra o Expo Go e escaneie o QR Code do terminal.
- No **iPhone**: Abra a câmera nativa, escaneie o QR Code e toque no banner para abrir no Expo Go.

---

## 🌐 Configuração da API

Por padrão, o app conecta na API de produção:

```typescript
// mobile/src/api.ts
export const API_BASE_URL = "https://sportstates.vercel.app";
```

Se estiver testando o servidor backend localmente na sua máquina, altere para o IP da sua rede local (ex: `http://192.168.1.100:3000`).
