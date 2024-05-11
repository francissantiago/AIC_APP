SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for user_terms
-- ----------------------------
DROP TABLE IF EXISTS `user_terms`;
CREATE TABLE `user_terms`  (
  `term_id` int(0) NOT NULL AUTO_INCREMENT COMMENT 'Identificação única, gerada automaticamente\r\n',
  `term_user_author` int(0) NOT NULL COMMENT 'Identificação do autor do termo',
  `term_user_editor` int(0) NOT NULL COMMENT 'Identificação do editor do termo',
  `term_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Título do termo',
  `term_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Corpo do termo',
  `term_created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT 'Data da criação',
  `term_updated_at` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT 'Data da atualização',
  PRIMARY KEY (`term_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_terms
-- ----------------------------
INSERT INTO `user_terms` VALUES (1, 1, 1, 'Termos de Usuário', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc fermentum, urna eget finibus\n					fermentum, velit metus maximus erat, nec sodales elit justo vitae sapien. Sed fermentum\n					varius erat, et dictum lorem. Cras pulvinar vestibulum purus sed hendrerit. Praesent et\n					auctor dolor. Ut sed ultrices justo. Fusce tortor erat, scelerisque sit amet diam rhoncus,\n					cursus dictum lorem. Ut vitae arcu egestas, congue nulla at, gravida purus.<br>Donec in justo urna. Fusce pretium quam sed viverra blandit. Vivamus a facilisis lectus.\n					Nunc non aliquet nulla. Aenean arcu metus, dictum tincidunt lacinia quis, efficitur vitae\n					dui. Integer id nisi sit amet leo rutrum placerat in ac tortor. Duis sed fermentum mi, ut\n					vulputate ligula.<br>Vivamus eget sodales elit, cursus scelerisque leo. Suspendisse lorem leo, sollicitudin\n					egestas interdum sit amet, sollicitudin tristique ex. Class aptent taciti sociosqu ad litora\n					torquent per conubia nostra, per inceptos himenaeos. Phasellus id ultricies eros. Praesent\n					vulputate interdum dapibus. Duis varius faucibus metus, eget sagittis purus consectetur in.\n					Praesent fringilla tristique sapien, et maximus tellus dapibus a. Quisque nec magna dapibus\n					sapien iaculis consectetur. Fusce in vehicula arcu. Aliquam erat volutpat. Class aptent\n					taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Edit', '2023-04-10 17:34:54', '2023-04-10 17:44:07');

SET FOREIGN_KEY_CHECKS = 1;
