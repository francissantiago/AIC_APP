<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>PHP_SITE_NAME</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .container {
            width: 600px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #07B28E;
            color: #fff;
            padding: 15px 0;
            text-align: center;
        }

        .header h1 {
            margin: 0;
        }

        .content {
            padding: 20px;
        }

        .content h2 {
            color: #333;
            margin: 0 0 15px;
        }

        .content p {
            line-height: 1.5;
        }

        .footer {
            background-color: #07B28E;
            color: #fff;
            padding: 15px 0;
            text-align: center;
        }

        .footer p {
            margin: 0;
        }

        .button {
            background-color: #0EFAC8;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }

        .link {
            color: #07B28E;
            text-decoration: none;
        }

        .link:hover {
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>PHP_SITE_NAME</h1>
        </div>

        <div class="content">
            <h2>Graça e paz de Cristo, PHP_USERNAME!</h2>
            <p>Obrigado por se cadastrar em nossa plataforma!</p>
            <p>Para completar seu registro e ativar sua conta, clique no botão a seguir:</p>
            <a href="PHP_SITE_URL/confirm_register?id=PHP_USERID&token=PHP_TOKEN" target="_blank" class="button">Confirmar
                Cadastro</a>
            <p> Ou copie e cole o link abaixo em seu navegador:</p>
            <p><a href="PHP_SITE_URL/confirm_register?id=PHP_USERID&token=PHP_TOKEN" class="link">PHP_SITE_URL/confirm_register?id=PHP_USERID&token=PHP_TOKEN</a></p>
            <p><b>Seus dados de login são:</b><br>
                <b>CPF:</b> PHP_USERLOGIN<br>
                <b>SENHA:</b> PHP_USERPASS<br>
            </p>
            <p>Este link irá expirar em <b>48 horas</b>.</p>
            <p>Se você tiver alguma dúvida ou precisar de ajuda, entre em contato conosco em <a href="mailto:PHP_SITE_EMAIL" class="link">PHP_SITE_EMAIL</a>.</p>
            <p><b>Se você não criou essa conta, entre em contato conosco no e-mail acima o mais rápido possível.</b></p>
        </div>

        <div class="footer">
            <p>&copy; PHP_SITE_NAME - 2024</p>
        </div>
    </div>
</body>

</html>
