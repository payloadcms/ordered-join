# Ordered Join Field Demo

This is a demo of how to use the join field, but have it leverage an array-like UI in the Payload admin panel. Now, all "joined" documents are instantly editable without using drawers, and you can even control the order via the array UI.

### How it works:

1. We use an array field as a `virtual` field to benefit from its UI
1. This array field is populated via an `afterRead` hook, using data from the join field
1. In a `beforeChange` hook, we "sync" any changes made to the joined in posts. If there are differences, the post will automatically be updated.

Check out the Categories collection to see more.

### Gotchas

1. We need a `defaultLimit` property for our join field, (or `paginate: false`) so you can get more than 10 docs at once in the join field response. ETA Tues Oct 29, 2024
1. If you delete a row from the UI, we don't handle the deletion of the joined doc. Could be messy. Might rather disable the `Remove` UI from the virtual array field
