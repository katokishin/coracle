<script lang="ts">
  import {onMount} from "svelte"
  import {nip19} from "nostr-tools"
  import {warn} from "src/util/logger"
  import {fromNostrURI} from "src/util/nostr"
  import Content from "src/partials/Content.svelte"
  import NoteDetail from "src/app/views/NoteDetail.svelte"
  import NaddrDetail from "src/app/views/NaddrDetail.svelte"
  import PersonDetail from "src/app/views/PersonDetail.svelte"
  import {Nip65} from "src/app/engine"

  export let entity

  entity = fromNostrURI(entity)

  let type, data, relays

  onMount(() => {
    try {
      ;({type, data} = nip19.decode(entity) as {type: string; data: any})
      relays = Nip65.selectHints(3, data.relays || [])
    } catch (e) {
      warn(e)
    }
  })
</script>

{#if type === "nevent"}
  <Content>
    <NoteDetail note={{id: data.id}} {relays} />
  </Content>
{:else if type === "note"}
  <Content>
    <NoteDetail note={{id: data}} />
  </Content>
{:else if type === "naddr"}
  <Content>
    <NaddrDetail {...data} />
  </Content>
{:else if type === "nprofile"}
  <PersonDetail npub={nip19.npubEncode(data.pubkey)} {relays} />
{:else if type === "npub"}
  <PersonDetail npub={entity} />
{:else}
  <Content size="lg" class="text-center">
    <div>Sorry, we weren't able to find "{entity}".</div>
  </Content>
{/if}
