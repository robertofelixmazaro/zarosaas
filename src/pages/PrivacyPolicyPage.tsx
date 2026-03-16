import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 16 de março de 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
            <p>
              A <strong className="text-foreground">Zaro Sistemas</strong> tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos as informações fornecidas por você ao utilizar nosso site, aplicativo e serviços relacionados.
            </p>
            <p className="mt-2">
              Ao acessar ou utilizar nossos serviços, você concorda com as práticas descritas nesta política, elaborada em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD) e demais legislações aplicáveis.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados Coletados</h2>
            <p>Podemos coletar os seguintes tipos de dados pessoais:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Dados de identificação:</strong> nome completo, CPF, e-mail e telefone.</li>
              <li><strong className="text-foreground">Dados de localização:</strong> cidade, estado e endereço informados no cadastro.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> informações sobre como você interage com o aplicativo, páginas visitadas, funcionalidades utilizadas, horários de acesso e dispositivo utilizado.</li>
              <li><strong className="text-foreground">Dados de pagamento:</strong> informações necessárias para processar transações financeiras, como dados de cobrança (os dados de cartão são processados por gateways seguros e não ficam armazenados em nossos servidores).</li>
              <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e identificadores de dispositivo.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Como Utilizamos os Dados</h2>
            <p>Os dados coletados são utilizados para as seguintes finalidades:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Fornecer, manter e melhorar nossos serviços e funcionalidades.</li>
              <li>Processar agendamentos, pedidos e transações realizadas na plataforma.</li>
              <li>Enviar comunicações importantes, como confirmações, lembretes e notificações.</li>
              <li>Personalizar a experiência do usuário e oferecer conteúdo relevante.</li>
              <li>Realizar análises internas para aprimoramento contínuo da plataforma.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
              <li>Prevenir fraudes e garantir a segurança do sistema.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Compartilhamento de Dados com Terceiros</h2>
            <p>
              A Zaro Sistemas não comercializa dados pessoais. Contudo, podemos compartilhar informações com terceiros nas seguintes situações:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Prestadores de serviço:</strong> empresas que auxiliam na operação da plataforma, como provedores de hospedagem, envio de e-mails, processamento de pagamentos e análise de dados.</li>
              <li><strong className="text-foreground">Obrigações legais:</strong> quando exigido por lei, ordem judicial ou autoridade competente.</li>
              <li><strong className="text-foreground">Proteção de direitos:</strong> para proteger os direitos, a propriedade ou a segurança da Zaro Sistemas, de seus usuários ou do público.</li>
            </ul>
            <p className="mt-2">
              Todos os terceiros com quem compartilhamos dados estão sujeitos a obrigações contratuais de confidencialidade e segurança.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Utilizamos cookies e tecnologias semelhantes para melhorar a experiência de navegação, analisar o tráfego do site e personalizar conteúdo. Os cookies podem ser:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Essenciais:</strong> necessários para o funcionamento básico do site e aplicativo.</li>
              <li><strong className="text-foreground">Analíticos:</strong> utilizados para entender como os usuários interagem com a plataforma.</li>
              <li><strong className="text-foreground">De preferências:</strong> permitem lembrar configurações e preferências do usuário.</li>
            </ul>
            <p className="mt-2">
              Você pode gerenciar as configurações de cookies diretamente no seu navegador. A desativação de certos cookies pode afetar a funcionalidade de alguns recursos.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Segurança das Informações</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Entre as medidas implementadas estão:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Criptografia de dados em trânsito (SSL/TLS) e em repouso.</li>
              <li>Controle de acesso baseado em funções (RBAC).</li>
              <li>Monitoramento contínuo de atividades suspeitas.</li>
              <li>Backups regulares e planos de recuperação de desastres.</li>
              <li>Políticas internas de segurança da informação.</li>
            </ul>
            <p className="mt-2">
              Apesar de nossos esforços, nenhum sistema é 100% seguro. Em caso de incidente de segurança que possa causar risco relevante, notificaremos os usuários afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Direitos dos Usuários (LGPD)</h2>
            <p>
              Em conformidade com a LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Confirmação e acesso:</strong> saber se tratamos seus dados e obter uma cópia deles.</li>
              <li><strong className="text-foreground">Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong className="text-foreground">Anonimização, bloqueio ou eliminação:</strong> solicitar a anonimização ou exclusão de dados desnecessários ou tratados em desconformidade.</li>
              <li><strong className="text-foreground">Portabilidade:</strong> solicitar a transferência dos seus dados a outro fornecedor de serviço.</li>
              <li><strong className="text-foreground">Revogação do consentimento:</strong> retirar o consentimento a qualquer momento, sem comprometer a legalidade do tratamento anterior.</li>
              <li><strong className="text-foreground">Oposição:</strong> opor-se ao tratamento realizado com fundamento em uma das hipóteses de dispensa de consentimento.</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer desses direitos, entre em contato pelo e-mail indicado na seção de contato desta política.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Armazenamento e Retenção de Dados</h2>
            <p>
              Seus dados pessoais são armazenados em servidores seguros e mantidos apenas pelo tempo necessário para cumprir as finalidades descritas nesta política, salvo quando houver obrigação legal ou regulatória que exija um período maior de retenção.
            </p>
            <p className="mt-2">
              Após o término do tratamento, os dados serão eliminados ou anonimizados, exceto nas hipóteses permitidas pela LGPD, como cumprimento de obrigação legal, uso exclusivo do controlador (desde que anonimizados) ou transferência a terceiro mediante consentimento.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Alterações nesta Política</h2>
            <p>
              A Zaro Sistemas reserva-se o direito de atualizar esta Política de Privacidade a qualquer momento. Quando realizarmos alterações significativas, notificaremos os usuários por meio do aplicativo, e-mail ou aviso em nosso site.
            </p>
            <p className="mt-2">
              Recomendamos que você revise esta página periodicamente para se manter informado sobre nossas práticas de privacidade. A data da última atualização será sempre indicada no topo deste documento.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contato</h2>
            <p>
              Se você tiver dúvidas, solicitações ou preocupações sobre esta Política de Privacidade ou sobre o tratamento dos seus dados pessoais, entre em contato conosco:
            </p>
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/50">
              <p className="font-semibold text-foreground">Zaro Sistemas</p>
              <p className="mt-1">
                E-mail:{" "}
                <a
                  href="mailto:contato@zarosistemas.com"
                  className="text-primary hover:underline"
                >
                  contato@zarosistemas.com
                </a>
              </p>
              <p className="mt-1 text-sm">
                Encarregado de Proteção de Dados (DPO) — disponível para atender solicitações dos titulares de dados conforme a LGPD.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zaro Sistemas. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
