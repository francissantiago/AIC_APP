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
							<label class="label" for="userName">Nome</label>
							<input type="text" class="form-control" id="userName" placeholder="João da Silva">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userDoc">CPF</label>
							<input type="text" class="form-control" id="userDoc" placeholder="000.000.000-00">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userBirth">Data de Nascimento</label>
							<input type="text" class="form-control" id="userBirth" placeholder="01/01/2000">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="userEmail">E-mail</label>
							<input type="text" class="form-control" id="userEmail" placeholder="email@email.com">
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

					<div class="form-group basic" style="display: none" id="div_userLegalResponsibleName">
						<div class="input-wrapper">
							<label class="label" for="userLegalResponsibleName">Nome do Responsável</label>
							<input type="text" class="form-control" id="userLegalResponsibleName" placeholder="Maria da Silva">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic" style="display: none" id="div_userLegalResponsibleDoc">
						<div class="input-wrapper">
							<label class="label" for="userLegalResponsibleDoc">CPF do Responsável</label>
							<input type="text" class="form-control" id="userLegalResponsibleDoc" placeholder="000.000.000-00">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="custom-control custom-checkbox mt-2 mb-1">
						<div class="form-check">
							<input type="checkbox" class="form-check-input" id="policyCheckbox">
							<label class="form-check-label" for="policyCheckbox">
								Eu aceito os <a href="#" data-bs-toggle="modal" data-bs-target="#policiesModal">Políticas de Usuário</a>.
							</label>
						</div>
					</div>
					<div class="custom-control custom-checkbox mt-2 mb-1">
						<div class="form-check">
							<input type="checkbox" class="form-check-input" id="termCheckbox">
							<label class="form-check-label" for="termCheckbox">
								Eu aceito os <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal">Termos e Condições de Usuário</a>.
							</label>
						</div>
					</div>

				</div>
			</div>
			<div class="form-button-group transparent">
				<button type="submit" class="btn btn-primary btn-block btn-lg" id="register_btn">Registrar</button>
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
$(document).ready(() => {
	let userName = $('#userName');
	let userDoc = $('#userDoc');
	let userBirth = $('#userBirth');
	let userEmail = $('#userEmail');
	let userPassword = $('#userPassword');
	let userRepeatPassword = $('#userRepeatPassword');
	let policyCheckbox = $('#policyCheckbox');
	let termCheckbox = $('#termCheckbox');
	let userLegalResponsibleName = $('#userLegalResponsibleName');
	let userLegalResponsibleDoc = $('#userLegalResponsibleDoc');

	let div_userLegalResponsibleName = $('#div_userLegalResponsibleName');
	let div_userLegalResponsibleDoc = $('#div_userLegalResponsibleDoc');

	let register_btn = $('#register_btn');
	

	// Inicia a página adicionando foco no Nome do Usuário
	//userName.focus();
	
	// Aplicar máscaras
	userDoc.mask('999.999.999-99');
	userLegalResponsibleDoc.mask('999.999.999-99');
	userBirth.mask('99/99/9999');

	// Validar CPF
	function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g,'');    
        if(cpf == '') return false; 
        // Elimina CPFs invalidos conhecidos
        if (cpf.length != 11 ||
            cpf == "00000000000" ||
            cpf == "11111111111" ||
            cpf == "22222222222" ||
            cpf == "33333333333" ||
            cpf == "44444444444" ||
            cpf == "55555555555" ||
            cpf == "66666666666" ||
            cpf == "77777777777" ||
            cpf == "88888888888" ||
            cpf == "99999999999")
            return false;       
        // Valida 1o digito
        add = 0;
        for (i=0; i < 9; i ++)
            add += parseInt(cpf.charAt(i)) * (10 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(9)))
            return false;       
        // Valida 2o digito
        add = 0;
        for (i = 0; i < 10; i ++)
            add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(10)))
            return false;       
        return true;   
    }

	// Validar E-mail
	function validarEmail(email) {
        var re = /\S+@\S+\.\S+/;
        return re.test(email);
    }

	// Valida idade do usuário
	function verificarIdade(userBirth) {
		var partesData = userBirth.split('/'); // Divide a data em dia, mês e ano

		// Cria um objeto Date com a data de nascimento fornecida (mês - 1 porque o mês é baseado em zero)
		var birthDateObj = new Date(partesData[2], partesData[1] - 1, partesData[0]);

		// Calcula a diferença em milissegundos entre a data de nascimento e a data atual
		var diff = Date.now() - birthDateObj.getTime();

		// Converte a diferença em anos
		var userAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));

		return userAge;

	}

	// Validação e apresentação dos campos de responsáveis legais
	userBirth.focusout(() => {
		if(verificarIdade(userBirth.val()) < 18 ){
			div_userLegalResponsibleName.show();
			div_userLegalResponsibleDoc.show();
			userLegalResponsibleName.val('');
			userLegalResponsibleDoc.val('');
			Swal.fire({
				title: "Atenção!",
				html: "Cadastro para menor de <b>18 anos</b>!<br>Favor preencher os dados do responsável!",
				icon: "info",
				showConfirmButton: false,
				timer: 2000
			});
		} else {
			userLegalResponsibleName.val('N/A');
			userLegalResponsibleDoc.val('N/A');
			div_userLegalResponsibleName.hide();
			div_userLegalResponsibleDoc.hide();
		}
	});

	register_btn.click((e) => {
		e.preventDefault();

		if(!userName.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>Nome</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userName.focus();
			});
		} else if(!userDoc.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>CPF</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userDoc.focus();
			});
		} else if(!userBirth.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>Data de Nascimento</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userBirth.focus();
			});
		} else if(!userEmail.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>E-mail</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userEmail.focus();
			});
		} else if(!userPassword.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>Senha</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userPassword.focus();
			});
		} else if(!userRepeatPassword.val()){
			Swal.fire({
				title: "Ops...",
				html: "O campo <b>Repetir a Senha</b> em branco!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			}).then(() => {
				userRepeatPassword.focus();
			});
		} else if(!policyCheckbox.prop('checked')){
			Swal.fire({
				title: "Ops...",
				html: "<b>Políticas de Usuário</b> não aceitas!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			});
		} else if(!termCheckbox.prop('checked')){
			Swal.fire({
				title: "Ops...",
				html: "<b>Termos e Condições de Usuário</b> não aceitos!",
				icon: "warning",
				showConfirmButton: false,
				timer: 2000
			});
		} else {
			if(validarCPF(userDoc.val())) { // Validação do CPF
            	if(validarEmail(userEmail.val())) { // Validação do E-mail
					if(userPassword.val() != userRepeatPassword.val()){  // Validação da correspondência das senhas
						Swal.fire({
							title: "Ops...",
							html: "As <b>senhas</b> não são idênticas!",
							icon: "warning",
							showConfirmButton: false,
							timer: 2000
						});
					} else { // Cadastro do usuário
						if(verificarIdade(userBirth.val()) >= 18 ){ //Usuário maior de 18 anos
							addUser();
						} else { // Usuário menor de 18 anos
							if(!userLegalResponsibleName.val()){
								Swal.fire({
									title: "Ops...",
									html: "Cadastro para menor de <b>18 anos</b>!<br><b>Nome do Responsável</b> em branco!",
									icon: "warning",
									showConfirmButton: false,
									timer: 2000
								});
							} else if(!userLegalResponsibleDoc.val()){
								Swal.fire({
									title: "Ops...",
									html: "Cadastro para menor de <b>18 anos</b>!<br><b>CPF do Responsável</b> em branco!",
									icon: "warning",
									showConfirmButton: false,
									timer: 2000
								});
							} else {
								if(validarCPF(userDoc.val())) { // Validação do CPF do responsável
									addUser();
								} else {
									Swal.fire({
										title: "Ops...",
										html: "<b>CPF do Responsável</b> inválido!",
										icon: "error",
										showConfirmButton: false,
										timer: 2000
									}).then(() => {
										userDoc.focus();
									});
								}
							}
						}
					}
				} else {
					Swal.fire({
						title: "Ops...",
						html: "<b>E-mail</b> inválido!",
						icon: "error",
						showConfirmButton: false,
						timer: 2000
					}).then(() => {
						userEmail.focus();
					});
				}
			} else {
				Swal.fire({
					title: "Ops...",
					html: "<b>CPF</b> inválido!",
					icon: "error",
					showConfirmButton: false,
					timer: 2000
				}).then(() => {
					userDoc.focus();
				});
			}
		}
	});

	function addUser() {
		$.ajax({
			url: 'actions/users/register.php',
			type: 'POST',
			dataType: 'json',
			data: {
				userName:userName.val(),
				userDoc:userDoc.val(),
				userBirth:userBirth.val(),
				userEmail:userEmail.val(),
				userPassword:userPassword.val(),
				userRepeatPassword:userRepeatPassword.val(),
				policyCheckbox:policyCheckbox.val(),
				termCheckbox:termCheckbox.val(),
				userLegalResponsibleName:userLegalResponsibleName.val(),
				userLegalResponsibleDoc:userLegalResponsibleDoc.val()
			},
			success: function(response){
				let jsonResponse = JSON.parse(JSON.stringify(response));
				console.log(jsonResponse);
				if(jsonResponse.code === 200){
					Swal.fire({
						title: "Sucesso!",
						html: jsonResponse.message,
						icon: "success",
						showConfirmButton: true,
						timer: 2000
					}).then(function(){
						//window.location.reload();
					});
				} else {
					Swal.fire({
						title: "Erro!",
						html: jsonResponse.message,
						icon: "error",
						showConfirmButton: true,
						timer: 2000
					});
				}
			},
			error: function(e){
				Swal.fire({
					title: "Erro!",
					html: "Ocorreu um erro grave no envio do formulário, verifique o console para mais detalhes.",
					icon: "error",
					showConfirmButton: true
				});
				console.log(e);
			}
		});
	}
});
</script>
</body>
</html>