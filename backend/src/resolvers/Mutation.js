const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_LENGTH = 10;
const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

const Mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO: Check if they are logged in
    const item = await ctx.db.mutation.createItem(
      { data: { ...args } },
      info,
    );

    return item;
  },
  updateItem(parent, args, ctx, info) {
    const updates = { ...args };
    const { id, ...updatesWithoutId } = updates;
    return ctx.db.mutation.updateItem({
      data: updatesWithoutId,
      where: {
        id: args.id,
      },
    }, info);
  },
  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    const item = await ctx.db.query.item(
      { where }, 
      `{ id title }`
    );
    return ctx.db.mutation.deleteItem({ where }, info);
  },
  async signup(parent, args, ctx, info) {
    const emailToLowerCase = args.email.toLowerCase();
    const password = await bcrypt.hash(args.password, SALT_LENGTH);
    const user = await ctx.db.mutation.createUser({
      data: {
        ...args,
        email: emailToLowerCase,
        password,
        permissions: { set: ['USER'] },


      }
    }, info);
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: ONE_YEAR,
    });
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    const user = await ctx.db.query.user({ where: { email }});
    if (!user) {
      throw new Error(`No such user found for email: ${email}`);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid Password');
    }
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: ONE_YEAR,
    });
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  }
};

module.exports = Mutations;
