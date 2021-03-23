/* eslint-disable no-param-reassign */
/**
 * @argument { import('@babel/core') } babel
 * @returns { import('@babel/core').PluginObj }
 * */
module.exports = function () {
  /** @argument { import('@babel/core').types.Comment[] } */
  const checkIsHtml = ([comment] = []) => comment?.type === 'CommentBlock' && comment?.value.trim() === 'html';
  const minifyHtml = (html = '') => html.trim().replace(/>\s+</g, '><').replace(/\s\s+/g, ' ');

  return {
    name: 'template-html-minifier',
    visitor: {
      TemplateLiteral({ node }) {
        if (checkIsHtml(node.leadingComments)) {
          node.leadingComments = null;
          node.quasis = node.quasis.map(quasis => {
            quasis.value.raw = minifyHtml(quasis.value.raw);
            quasis.value.cooked = minifyHtml(quasis.value.cooked);

            return quasis;
          });
        }
      },
      StringLiteral({ node }) {
        if (checkIsHtml(node.leadingComments)) {
          node.leadingComments = null;
          node.value = minifyHtml(node.value);
        }
      },
    },
  };
};
