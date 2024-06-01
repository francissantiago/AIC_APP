<?php
require_once ($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Classe responsável pelo envio de emails através do PHPMailer.
 */
class MailerController
{
    /**
     * Host do servidor SMTP utilizado para o envio de emails.
     *
     * @var string $mailHost
     */
    private $mailHost;

    /**
     * Nome de usuário para autenticação no servidor SMTP.
     *
     * @var string $mailUsername
     */
    private $mailUsername;

    /**
     * Senha para autenticação no servidor SMTP.
     *
     * @var string $mailPassword
     */
    private $mailPassword;

    /**
     * Tipo de segurança utilizada pela conexão SMTP (ex: tls, ssl).
     *
     * @var string $mailSMTPSecure
     */
    private $mailSMTPSecure;

    /**
     * Porta utilizada pelo servidor SMTP para envio de emails.
     *
     * @var int $mailPort
     */
    private $mailPort;

    /**
     * Email utilizado como remetente padrão para envio de emails.
     *
     * @var string $mailFrom
     */
    private $mailFrom;

    /**
     * Nome do remetente padrão utilizado para envio de emails.
     *
     * @var string $mail_FromName
     */
    private $mailFromName;

    /**
     * Construtor da classe.
     *
     * Armazena as credenciais e configurações de SMTP fornecidas como parâmetros.
     *
     * @param string $mailHost Host do servidor SMTP.
     * @param string $mailUsername Nome de usuário para autenticação SMTP.
     * @param string $mailPassword Senha para autenticação SMTP.
     * @param string $mailSMTPSecure Tipo de segurança utilizada pela conexão SMTP (ex: tls, ssl).
     * @param int $mailPort Porta utilizada pelo servidor SMTP.
     * @param string $mailFrom Email utilizado como remetente padrão.
     * @param string $mail_FromName Nome do remetente padrão.
     */
    public function __construct($mailHost, $mailUsername, $mailPassword, $mailSMTPSecure, $mailPort, $mailFrom, $mail_FromName)
    {
        $this->mailHost = $mailHost;
        $this->mailUsername = $mailUsername;
        $this->mailPassword = $mailPassword;
        $this->mailSMTPSecure = $mailSMTPSecure;
        $this->mailPort = $mailPort;
        $this->mailFrom = $mailFrom;
        $this->mailFromName = $mail_FromName;
    }

    /**
     * Envia um email utilizando o PHPMailer.
     *
     * Esta função configura o PHPMailer com as credenciais e parâmetros fornecidos, compõe o email e tenta o envio.
     *
     * @param string $fromEmail Email do remetente da mensagem.
     * @param string $fromName Nome do remetente da mensagem.
     * @param string $toEmail Email do destinatário da mensagem.
     * @param string $toName Nome do destinatário da mensagem (opcional).
     * @param string $subject Assunto da mensagem.
     * @param string $htmlBody Corpo do email em formato HTML.
     * @param string $textBody Corpo do email em formato de texto simples.
     * @param string $attachmentPath Caminho para um arquivo a ser anexado ao email (opcional).
     * @return array Retorna um array contendo o código e a mensagem de status do envio.
     *  - código (int): Código HTTP indicando o resultado da operação.
     *    - 200: Email enviado com sucesso.
     *    - 400: Parâmetros insuficientes fornecidos.
     *    - 503: Erro ao enviar a mensagem.
     *  - message (string): Mensagem de status descrevendo o resultado da operação.
     */
    public function sendEmail($fromEmail, $fromName, $toEmail, $toName, $subject, $htmlBody, $textBody, $attachmentPath = null)
    {
        // Validação dos parâmetros
        if (empty($fromEmail) || empty($toEmail) || empty($subject) || empty($htmlBody) || empty($textBody)) {
            return ['code' => 400, 'message' => 'Parâmetros insuficientes fornecidos.'];
        }

        $mail = new PHPMailer(true);

        try {
            // Configuração do SMTP
            $mail->isSMTP();
            $mail->CharSet = 'UTF-8';
            $mail->Host = $this->mailHost;
            $mail->Port = $this->mailPort;
            $mail->SMTPAuth = true;
            $mail->Username = $this->mailUsername;
            $mail->Password = $this->mailPassword;
            $mail->SMTPSecure = $this->mailSMTPSecure;

            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($toEmail, $toName); // Destinatário
            $mail->Subject = $subject; // Assunto

            // Configuração do conteúdo do e-mail
            $mail->isHTML(true);
            $mail->msgHTML($htmlBody); // Corpo do e-mail em HTML
            $mail->AltBody = $textBody; // Corpo do e-mail em texto simples

            // Adicionar anexo, se fornecido
            if ($attachmentPath !== null) {
                if (file_exists($attachmentPath)) {
                    $mail->addAttachment($attachmentPath);
                } else {
                    return ['code' => 400, 'message' => 'Anexo não encontrado: ' . $attachmentPath];
                }
            }

            // Enviar o e-mail
            $mail->send();
            return ['code' => 200, 'message' => 'Email enviado com sucesso'];
        } catch (Exception $e) {
            // Registro do erro para fins de depuração
            error_log('Erro ao enviar e-mail: ' . $mail->ErrorInfo . ' Exceção: ' . $e->getMessage());
            return [
                'code' => 503,
                'message' => 'Não foi possível enviar a mensagem. Erro do Mailer: ' . $mail->ErrorInfo . ' Exceção: ' . $e->getMessage()
            ];
        }
    }
}
?>