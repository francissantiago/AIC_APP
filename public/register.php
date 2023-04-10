<?php
$path = $_SERVER['DOCUMENT_ROOT'];
include_once($path.'/public/partials/header.php');
?>
<!-- App Capsule -->
<div id="appCapsule">
	<div class="section mt-2 text-center">
		<h1>Registrar</h1>
		<h4>Crie uma conta</h4>
	</div>
	<div class="section mb-5 p-2">
		<form action="index.html">
			<div class="card">
				<div class="card-body">
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

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userRepeatPassword">Repetir a Senha</label>
							<input type="password" class="form-control" id="userRepeatPassword" autocomplete="off"
								placeholder="Digite sua senha novamente">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="custom-control custom-checkbox mt-2 mb-1">
						<div class="form-check">
							<input type="checkbox" class="form-check-input" id="customCheckb1">
							<label class="form-check-label" for="customCheckb1">
								Eu aceito os <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal">termos e condições</a>
							</label>
						</div>
					</div>

				</div>
			</div>
			<div class="form-button-group transparent">
				<button type="submit" class="btn btn-primary btn-block btn-lg">Registrar</button>
			</div>

		</form>
	</div>
</div>
<!-- * App Capsule -->


<!-- Terms Modal -->
<div class="modal fade modalbox" id="termsModal" tabindex="-1" role="dialog">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Termos e Condições</h5>
				<a href="#" data-bs-dismiss="modal">Fechar</a>
			</div>
			<div class="modal-body">
				<p>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc fermentum, urna eget finibus
					fermentum, velit metus maximus erat, nec sodales elit justo vitae sapien. Sed fermentum
					varius erat, et dictum lorem. Cras pulvinar vestibulum purus sed hendrerit. Praesent et
					auctor dolor. Ut sed ultrices justo. Fusce tortor erat, scelerisque sit amet diam rhoncus,
					cursus dictum lorem. Ut vitae arcu egestas, congue nulla at, gravida purus.
				</p>
				<p>
					Donec in justo urna. Fusce pretium quam sed viverra blandit. Vivamus a facilisis lectus.
					Nunc non aliquet nulla. Aenean arcu metus, dictum tincidunt lacinia quis, efficitur vitae
					dui. Integer id nisi sit amet leo rutrum placerat in ac tortor. Duis sed fermentum mi, ut
					vulputate ligula.
				</p>
				<p>
					Vivamus eget sodales elit, cursus scelerisque leo. Suspendisse lorem leo, sollicitudin
					egestas interdum sit amet, sollicitudin tristique ex. Class aptent taciti sociosqu ad litora
					torquent per conubia nostra, per inceptos himenaeos. Phasellus id ultricies eros. Praesent
					vulputate interdum dapibus. Duis varius faucibus metus, eget sagittis purus consectetur in.
					Praesent fringilla tristique sapien, et maximus tellus dapibus a. Quisque nec magna dapibus
					sapien iaculis consectetur. Fusce in vehicula arcu. Aliquam erat volutpat. Class aptent
					taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.
				</p>
			</div>
		</div>
	</div>
</div>
<!-- * Terms Modal -->


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