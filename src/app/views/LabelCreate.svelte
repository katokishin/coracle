<script>
  import {modal, toast} from "src/partials/state"
  import Heading from "src/partials/Heading.svelte"
  import Content from "src/partials/Content.svelte"
  import Anchor from "src/partials/Anchor.svelte"
  import Field from "src/partials/Field.svelte"
  import MultiSelect from "src/partials/MultiSelect.svelte"
  import engine, {Builder, Outbox, user} from "src/app/engine"

  export let note

  const {searchTopics} = engine.Content

  const submit = () => {
    const tags = [["e", note.id]]

    if (topics.length > 0) {
      tags.push(["L", "#t"])

      for (const topic of topics) {
        tags.push(["l", topic.name, "#t"])
      }
    }

    Outbox.publish({
      event: Builder.createLabel({tagClient: false, tags}),
      relays: user.getRelayUrls("write"),
    })

    toast.show("info", "Your tag has been saved!")
    modal.pop()
  }

  let topics = []
</script>

<form on:submit|preventDefault={submit}>
  <Content>
    <Heading class="text-center">Add Tags</Heading>
    <p class="text-center">
      Recommend content to people who follow you. You can find
      your recommendations under the "Explore" tab.
    </p>
    <div class="flex w-full flex-col gap-8">
      <Field label="Tags" info="Tag this content so other people can find it">
        <MultiSelect
          autofocus
          search={$searchTopics}
          bind:value={topics}
          termToItem={name => ({name})}>
          <div slot="item" let:item>
            <strong>{item.name}</strong>
          </div>
        </MultiSelect>
      </Field>
      <Anchor tag="button" theme="button" type="submit" class="text-center">Save</Anchor>
    </div>
  </Content>
</form>
