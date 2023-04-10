<?php
$path = $_SERVER['DOCUMENT_ROOT'];
include_once ($path.'/public/partials/header.php');
include_once ($path.'/functions/all_includes.php');
$get_termsAndCondictions = get_termsAndCondictions();
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
					<?php
						if(empty($get_termsAndCondictions)){
							echo "Sem termos e condições.";
						} else {
							foreach ($get_termsAndCondictions as $key => $value):
								$terms_id = $value['terms_id'];
								$terms_user_author = $value['terms_user_author'];
								$terms_user_editor = $value['terms_user_editor'];
								$terms_title = $value['terms_title'];
								$terms_text = $value['terms_text'];
								$terms_created_at = date('d/m/Y H:i', strtotime($value['terms_created_at']));

								echo $terms_title;
								echo "<p>";
								echo $terms_text;
								echo "</p>";
								echo "<p>";
								echo "Criado em: ".$terms_created_at;
								echo "</p>";
								if (!is_null($value['terms_updated_at'])) {
									$terms_updated_at = date('d/m/Y H:i', strtotime($value['terms_updated_at']));
									echo "<p>";
									echo "Atualizado em: ".$terms_updated_at;
									echo "</p>";
								}
		 					endforeach;
		 				}
	 				?>
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