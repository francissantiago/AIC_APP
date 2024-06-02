<?php
$path = $_SERVER['DOCUMENT_ROOT'];
include_once ($path . '/public/partials/header.php');
// Verifica o status atual da sessão
if (session_status() === PHP_SESSION_NONE) {
    // Inicia a sessão se não estiver ativa
    session_start();
}

if(isset($_SESSION['session_user_id']) && isset($_SESSION['session_user_doc']) && isset($_SESSION['session_user_email'])){
	header('location: dashboard');
}
?>
<!-- App Capsule -->
<div id="appCapsule">
	<div class="section mt-2 text-center">
		<h1>Entrar</h1>
		<h4>Preencha o formulário para entrar</h4>
	</div>
	<div class="section mb-5 p-2">
		<form>
			<div class="card">
				<div class="card-body pb-1">
					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userLogin">CPF</label>
							<input type="text" class="form-control" id="userLogin" placeholder="Seu CPF">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userPassword">Senha</label>
							<input type="password" class="form-control" id="userPassword" autocomplete="off"
								placeholder="Sua Senha">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>
				</div>
			</div>
			<div class="form-links mt-2">
				<div>
					<a href="register">Registrar</a>
				</div>
				<div><a href="forgotPass" class="text-muted">Esqueceu a senha?</a></div>
			</div>
			<div class="form-button-group  transparent">
				<button type="submit" class="btn btn-primary btn-block btn-lg" id="login_btn">Entrar</button>
			</div>
		</form>
	</div>
</div>
<!-- * App Capsule -->
<!-- ========= JS Files =========  -->
<!-- Bootstrap -->
<script src="<?php $path; ?>/assets/js/lib/bootstrap.bundle.min.js"></script>
<!-- Ionicons -->
<script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
<!-- Splide -->
<script src="<?php $path; ?>/assets/js/plugins/splide/splide.min.js"></script>
<!-- Base Js File -->
<script src="<?php $path; ?>/assets/js/base.js"></script>
<!-- Custom JS -->
<script type="text/javascript">
	// Focar no input de login ao carregar a tela e formatar CPF
	$(document).ready(function () {
		var login_user = $('#userLogin');
		var login_password = $('#userPassword');
		var login_btn = $('#login_btn');

		login_user.focus();

		login_user.focus();
		login_user.mask('999.999.999-99', { reverse: true });

		login_btn.click((e) => {
			e.preventDefault();

			let login_user_val = login_user.val();
			let login_password_val = login_password.val();

			if (!login_user_val) {
				Swal.fire({
					title: "Ops!",
					html: "Preencha o campo <b>CPF</b>!",
					icon: "warning",
					showConfirmButton: false,
					timer: 2000
				}).then(() => {
					login_user.focus();
				});
			} else if (!login_password_val) {
				Swal.fire({
					title: "Ops!",
					html: "Preencha o campo <b>Senha</b>!",
					icon: "warning",
					showConfirmButton: false,
					timer: 2000
				}).then(() => {
					login_user.focus();
				});
			} else {
				$.ajax({
					url: 'actions/users/login.php',
					type: 'POST',
					dataType: 'json',
					data: {
						login_user_val: login_user_val,
						login_password_val: login_password_val
					},
					success: function (response) {
						let jsonResponse = JSON.parse(JSON.stringify(response));
						console.log(jsonResponse);
						if (jsonResponse.code === 200) {
							Swal.fire({
								title: "Acesso Concedido!",
								html: jsonResponse.message,
								icon: "success",
								showConfirmButton: true,
								timer: 2000
							}).then(function () {
								window.location.href = "login";
							});
						} else {
							Swal.fire({
								title: "Acesso Negado!",
								html: jsonResponse.message,
								icon: "error",
								showConfirmButton: true,
								timer: 5000
							});
						}
					},
					error: function (e) {
						Swal.fire({
							title: "Erro!",
							html: e.message,
							icon: "error",
							showConfirmButton: true,
							timer: 5000
						});
						console.log(e);
					}
				});
			}


		});

	});
</script>
</body>

</html>