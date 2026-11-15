import {
  ArrowRight,
  CalendarDays,
  Database,
  Settings2,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

const workflows = [
  {
    title: "Cadastrar uma liga",
    path: "ligas",
    action: "Abrir Ligas",
    Icon: Trophy,
    steps: [
      <>
        Em <strong>Nova liga</strong>, selecione o esporte e informe o nome que
        aparecerá no portal.
      </>,
      <>
        Use o identificador já adotado pelo Sportstates, como <code>bra.1</code>{" "}
        para o Brasileirão Série A. Procure pelo código na lista antes de criar
        um cadastro.
      </>,
      <>
        Salve. Para uma liga de futebol com integração compatível, abra{" "}
        <strong>Fontes</strong> na linha da competição para definir as
        prioridades.
      </>,
    ],
  },
  {
    title: "Cadastrar um time",
    path: "times",
    action: "Abrir Times",
    Icon: Shield,
    steps: [
      <>
        Em <strong>Adicionar time</strong>, selecione o esporte e a liga. Faça
        uma busca para reaproveitar os dados disponíveis.
      </>,
      <>
        Confira o nome e o identificador que ligam o perfil aos jogos. Preencha
        os dados complementares, como estádio, escudo e títulos.
      </>,
      <>Salve o perfil e procure o time no portal para conferir o resultado.</>,
    ],
  },
  {
    title: "Configurar fontes de dados",
    path: "apis",
    action: "Abrir APIs e fontes",
    Icon: Database,
    steps: [
      <>
        Em <strong>APIs e fontes</strong>, consulte as integrações e as
        variáveis de ambiente. Cadastre as chaves no servidor, em{" "}
        <strong>Vercel → Settings → Environment Variables</strong>, e faça um
        novo deploy.
      </>,
      <>
        Em <strong>Ligas → Fontes</strong>, informe a temporada e o código do
        provedor. Exemplo para a Premier League na temporada 2026/27 com
        football-data.org: temporada <code>2026</code>, código <code>PL</code>.
      </>,
      <>
        Escolha os dados que deseja consultar, ordene as fontes, teste a
        cobertura e salve. Para publicar uma lista complementar de uma API
        própria, use <strong>APIs personalizadas</strong>.
      </>,
    ],
  },
  {
    title: "Destacar jogos e confirmar transmissões",
    path: "jogos",
    action: "Abrir Jogos do dia",
    Icon: CalendarDays,
    steps: [
      <>
        Selecione a data e o esporte. Edite a partida que deve aparecer como{" "}
        <strong>Jogo do Dia</strong> na Home.
      </>,
      <>
        Para incluir um canal, vá a{" "}
        <Link to="/admin/transmissoes">Transmissões</Link> e abra a partida.
        Confira o confronto, a data e a disponibilidade da transmissão no Brasil
        na fonte de referência.
      </>,
      <>
        Informe o canal, a URL de referência e a data da revisão. Salve e
        confira a seção <strong>Onde assistir</strong> na partida.
      </>,
    ],
  },
  {
    title: "Completar o perfil de um jogador",
    path: "jogadores",
    action: "Abrir Jogadores",
    Icon: UserRound,
    steps: [
      <>
        Busque por nome ou código na ESPN. Confira o clube e o esporte para
        distinguir jogadores com nomes parecidos.
      </>,
      <>
        Para editar um perfil existente, copie o identificador após{" "}
        <code>/jogadores/</code> na URL pública e use{" "}
        <strong>Abrir cadastro</strong>.
      </>,
      <>
        Revise os campos preenchidos, acrescente clubes e premiações e salve o
        perfil.
      </>,
    ],
  },
  {
    title: "Personalizar a Home e as classificações",
    path: "customizacoes",
    action: "Abrir Customizações",
    Icon: Settings2,
    steps: [
      <>Escolha as cores de fundo dos temas claro e escuro.</>,
      <>
        Use as listas de ordenação para definir as primeiras ligas da Home e das
        Classificações. Cada página tem a sua ordem.
      </>,
      <>
        Clique em <strong>Publicar customizações</strong> e abra o portal para
        conferir.
      </>,
    ],
  },
];

export default function AdminGuide() {
  return (
    <div className="studio-guide">
      {workflows.map(({ title, path, action, Icon, steps }) => (
        <section className="admin-overview-panel studio-guide-card" key={path}>
          <h2>
            <Icon size={20} aria-hidden="true" /> {title}
          </h2>
          <ol>
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <Link to={`/admin/${path}`}>
            {action} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ))}
    </div>
  );
}
