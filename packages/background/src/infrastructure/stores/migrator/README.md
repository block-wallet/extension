## State Migrations

In order to update the global state to a new version if the internal composition of one of its child controllers properties is changed (e.g. a new added property inside the accounts structure) a migration must be added so the [**migrator**](migrator.ts) can update the state composition following the rules and steps listed below:

1. The **package.json** version must be patched or bumped to the desired version
2. A migration file must be added on [`src/infrastructure/stores/migrator/migrations`](migrations) and a migration object implementing the [`IMigration`](IMigration.ts) interface, exported as default.

example:

```ts
export default {
  migrate: async (persistedState: BlankAppState) => {
    const { accounts } = persistedState.AccountTrackerController;
    const updatedAccounts = {} as typeof accounts;
    for (const [address, values] of Object.entries(accounts)) {
      updatedAccounts[address] = {
        ...values,
        tokens: {},
      };
    }

    return {
      ...persistedState,
      AccountTrackerController: {
        accounts: updatedAccounts,
      },
    };
  },
  // Migration version must match new bumped package.json version
  version: '0.2.0',
};
```

3. The newly added migration must be included in the `migrations` array inside of [`src/infrastructure/stores/migrator/migrations/index.ts`](migrations/index.ts)

4. The state will be reconciled against the persisted and the initial one down to two levels deep and the migration run against it, when the extension is first loaded and a version change is detected. [See more](../../../index.ts#L20)
