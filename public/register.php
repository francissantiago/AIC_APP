<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require ($path.'/public/partials/header.php');
require ($path.'/controllers/policies/PoliciesController.php');

/* Recupera informações de políticas e termos de usuário */
$getPoliciesClass = new PoliciesController($conn);
// Políticas de Usuário
$callResponsePolicies = $getPoliciesClass->get_userPolicies();
$getResponsePolicies_code = $callResponsePolicies['code'];
$getResponsePolicies_message = $callResponsePolicies['message'];
// Termos de Usuário
$callResponseTerms = $getPoliciesClass->get_userTerms();
$getResponseTerms_code = $callResponseTerms['code'];
$getResponseTerms_message = $callResponseTerms['message'];

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
								Eu aceito os <a href="#" data-bs-toggle="modal" data-bs-target="#policiesModal">Políticas de Usuário</a>.
							</label>
						</div>
					</div>
					<div class="custom-control custom-checkbox mt-2 mb-1">
						<div class="form-check">
							<input type="checkbox" class="form-check-input" id="customCheckb2">
							<label class="form-check-label" for="customCheckb2">
								Eu aceito os <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal">Termos e Condições de Usuário</a>.
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

<!-- Policies Modal -->
<div class="modal fade modalbox" id="policiesModal" tabindex="-1" role="dialog">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Políticas de Usuário</h5>
				<a href="#" data-bs-dismiss="modal">Fechar</a>
			</div>
			<div class="modal-body">
				<p>
					<?php
						if(!is_array($getResponsePolicies_message)){
							echo "Sem termos e condições.";
						} else {
							foreach ($getResponsePolicies_message as $value) {
								$policy_id = $value['policy_id'];
								$policy_user_author = $value['policy_user_author'];
								$policy_user_editor = $value['policy_user_editor'];
								$policy_title = $value['policy_title'];
								$policy_text = $value['policy_text'];
								$policy_created_at = date('d/m/Y H:i', strtotime($value['policy_created_at']));

								echo "<p>";
								echo $policy_text;
								echo "</p>";
								echo "<p>";
								echo "Criado em: ".$policy_created_at;
								echo "</p>";
								if (!is_null($value['policy_updated_at'])) {
									$policy_updated_at = date('d/m/Y H:i', strtotime($value['policy_updated_at']));
									echo "<p>";
									echo "Atualizado em: ".$policy_updated_at;
									echo "</p>";
								}
		 					}
		 				}
	 				?>
	 			</p>
			</div>
		</div>
	</div>
</div>

<!-- Terms Modal -->
<div class="modal fade modalbox" id="termsModal" tabindex="-1" role="dialog">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Termos e Condições de Usuário</h5>
				<a href="#" data-bs-dismiss="modal">Fechar</a>
			</div>
			<div class="modal-body">
				<p>
					<?php
						if(!is_array($getResponseTerms_message)){
							echo "Sem termos e condições.";
						} else {
							foreach ($getResponseTerms_message as $value) {
								$term_id = $value['term_id'];
								$term_user_author = $value['term_user_author'];
								$term_user_editor = $value['term_user_editor'];
								$term_title = $value['term_title'];
								$term_text = $value['term_text'];
								$term_created_at = date('d/m/Y H:i', strtotime($value['term_created_at']));

								echo "<p>";
								echo $term_text;
								echo "</p>";
								echo "<p>";
								echo "Criado em: ".$term_created_at;
								echo "</p>";
								if (!is_null($value['term_updated_at'])) {
									$term_updated_at = date('d/m/Y H:i', strtotime($value['term_updated_at']));
									echo "<p>";
									echo "Atualizado em: ".$term_updated_at;
									echo "</p>";
								}
		 					}
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