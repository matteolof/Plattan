Plattan v118 – InstancedMesh för byggplattornas kantstänger

Utgår från v117. Byggplattornas cylindriska kantstänger ritas nu i InstancedMesh-grupper, sorterade efter färg. Det minskar antalet draw calls för stora byggen, som huset och ladan.

Grupperna byggs om bara när plattor läggs till/tas bort eller en annan spelares bygge uppdateras. Plattornas ytor, kollisionskontroller, byggläge, import/export och avståndsstyrd genomskinlighet från v117 behålls. Ingen FPS-mätare.

OBS: Inte alla byggplattors ytor är instansierade ännu; den här versionen är ett första säkert prestandatest för kantgeometrin. Testa gärna samma importerade bygge i v117 och v118 på samma enhet.
