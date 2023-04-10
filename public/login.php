<?php
$path = $_SERVER['DOCUMENT_ROOT'];
include_once ($path.'/public/partials/header.php');
?>
<!-- App Capsule -->
<div id="appCapsule">
	<div class="section mt-2 text-center">
		<h1>Entrar</h1>
		<h4>Preencha o formulário para entrar</h4>
	</div>
	<div class="section mb-5 p-2">
		<form action="index.html">
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
				<button type="submit" class="btn btn-primary btn-block btn-lg">Entrar</button>
			</div>
		</form>
	</div>
</div>
<!-- * App Capsule -->
<!-- ========= JS Files =========  -->
<!-- Bootstrap -->
<script src="<?php $path;?>/assets/js/lib/bootstrap.bundle.min.js"></script>
<!-- Ionicons -->
<script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
<!-- Splide -->
<script src="<?php $path;?>/assets/js/plugins/splide/splide.min.js"></script>
<!-- Base Js File -->
<script src="<?php $path;?>/assets/js/base.js"></script>
<!-- Custom JS -->
<script type="text/javascript">
// Focar no input de login ao carregar a tela e formatar CPF
$(document).ready(function(){
	$('#userLogin').focus();
	var mask_login = $('#userLogin');
	mask_login.focus();
	mask_login.mask('999.999.999-99', {reverse: true});
});
</script>
</body>
</html>