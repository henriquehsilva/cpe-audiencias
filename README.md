# Agenda de Audiências CPE

PWA completo para gerenciamento de audiências do CPE com React, TypeScript, Vite e Firebase.

## 🚀 Funcionalidades

- **Autenticação Firebase** com controle de acesso baseado em papéis (RBAC)
- **PWA completo** com funcionamento offline e "Adicionar à Tela Inicial"
- **Interface responsiva** otimizada para mobile e desktop
- **Busca avançada** com normalização e filtros inteligentes
- **Sincronização em tempo real** com persistência offline
- **Design institucional** seguindo padrões de acessibilidade

## 👥 Papéis de Usuário

- **PM (Policial Militar)**: Visualização de audiências e busca
- **SAD (Administrador)**: Acesso completo incluindo cadastro, edição e exclusão

## 🛠 Tecnologias

- React 18 + TypeScript + Vite
- Firebase v9 (Auth + Firestore)
- Tailwind CSS + Tema personalizado CPE
- React Router + Proteção de rotas
- React Hook Form + Zod
- date-fns (locale pt-BR)
- vite-plugin-pwa

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 2. Firebase Setup

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password)
3. Ative Firestore Database
4. Configure as regras de segurança do Firestore
5. Importe os índices do arquivo `firestore.indexes.json`

### 3. Instalação

```bash
npm install
npm run dev
```

### 4. Deploy

```bash
npm run build
# Deploy conforme sua preferência (Firebase Hosting, Netlify, etc.)
```

## 🔐 Configuração de Papéis

Para definir papéis de usuário, use a Cloud Function incluída:

### Via Firebase Functions Shell:
```bash
firebase functions:shell
setUserRole('user@email.com', 'sad')
```

### Via Node.js direto:
```bash
node functions/setUserRole.js user@email.com sad
```

## 📱 PWA Features

- **Manifest**: Configurado para instalação como app nativo
- **Service Worker**: Cache inteligente com Workbox
- **Offline**: Funciona completamente offline com dados em cache
- **Responsivo**: Interface adaptada para todos os tamanhos de tela
- **Acessível**: Suporte completo a leitores de tela e navegação por teclado

## 🎨 Design System

### Cores CPE:
- **cpe-dark**: #0A0B0D
- **cpe-gray**: #363432  
- **cpe-red**: #D90404
- **cpe-gold**: #F0941F

### Tipografia:
- **Primária**: ThoughtWorks (com fallback para Inter)
- **Sistema**: Inter, system-ui, sans-serif

## 📊 Estrutura do Banco

### Coleção: `agendas`

```typescript
interface Agenda {
  startsAt: Timestamp;        // Data/hora combinadas
  dataStr: string;            // YYYY-MM-DD para filtros
  horario: string;            // HH:mm
  local: string;
  policial: string;           // Posto/Nome
  modalidade: string;
  sei: string;
  
  // Campos normalizados para busca
  local_n: string;
  policial_n: string;
  modalidade_n: string;
  sei_n: string;
  keywords: string[];
  
  // Metadados
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🔍 Sistema de Busca

- **Normalização**: Remove acentos e converte para minúsculo
- **Keywords**: Array de tokens para busca otimizada
- **Filtros**: Por período (hoje/semana/mês) e modalidades
- **Debounce**: Busca em tempo real com delay de 300ms

## 📋 TODO / Melhorias

- [ ] Implementar edição de audiências
- [ ] Notificações push para lembretes
- [ ] Exportação para PDF/Excel
- [ ] Relatórios e estatísticas
- [ ] Integração com calendário
- [ ] Backup automático
- [ ] Logs de auditoria

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.