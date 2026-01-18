import { convexAuth } from '@convex-dev/auth/server'
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials'
import { createAccount, retrieveAccount } from '@convex-dev/auth/server'
import { Scrypt } from 'lucia'
import { match, P } from 'ts-pattern'
import type { DataModel } from './_generated/dataModel'

export const Password = () =>
  ConvexCredentials<DataModel>({
    authorize: async (params, ctx) => {
      return match(params)
        .with(
          {
            email: P.string,
            flow: 'signUp',
            name: P.string,
            password: P.string,
          },
          async ({ name, email, password }) => {
            const createdAccount = await createAccount<DataModel>(ctx, {
              account: { id: email, secret: password },
              profile: {
                name,
              },
              provider: 'password',
              shouldLinkViaEmail: false, // Only link after email verification
            })

            return { userId: createdAccount.user._id }
          },
        )
        .with(
          { email: P.string, flow: 'signIn', password: P.string },
          async ({ email, password }) => {
            const retrieved = await retrieveAccount(ctx, {
              account: { id: email, secret: password },
              provider: 'password',
            })
            if (retrieved === null) {
              throw new Error('Invalid credentials')
            }

            return { userId: retrieved.user._id }
          },
        )
        .run()
    },
    crypto: {
      async hashSecret(password: string) {
        return await new Scrypt().hash(password)
      },
      async verifySecret(password: string, hash: string) {
        return await new Scrypt().verify(hash, password)
      },
    },
    id: 'password',
  })

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password()],
})
