const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

const { transport, makeANiceEmail } = require('../mail');

const SALT_LENGTH = 10;
const ONE_HOUR = 1000 * 60 * 60;
const ONE_YEAR = ONE_HOUR * 24 * 365;

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that.');
    }
    const item = await ctx.db.mutation.createItem(
      { 
        data: {
          ...args,
          user: {
            connect: { id: ctx.request.userId },
          } 
        } 
      },
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
  },
  async requestReset(parent, args, ctx, info) {
    const { email } = args;
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found with email ${email}`);
    }
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + ONE_HOUR;
    const res = await ctx.db.mutation.updateUser({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });
    const mailRes = await transport.sendMail({
      from: 'shawn@shawn.com',
      to: user.email,
      subject: 'You password reset token...',
      html: makeANiceEmail(`
        Your password reset token is here!
        \n\n
        <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">
          Click here to reset!
        </a>
      `),
    })
    
    return { message: 'Thanks!' };
  },
  async resetPassword(parent, args, ctx, info) {
    const { password, confirmPassword, resetToken } = args;
    if (password !== confirmPassword) {
      throw new Error ('Passwords don\'t match!');
    }
    const [user] = await ctx.db.query.users({
      where: { resetToken},
      resetTokenExpiry: Date.now() - ONE_HOUR,
    });
    if (!user) {
      throw new Error('This token is either invalid or expired!');
    }
    const { email } = user;
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: ONE_YEAR,
    });
    return updatedUser;
  }
};

module.exports = Mutations;
