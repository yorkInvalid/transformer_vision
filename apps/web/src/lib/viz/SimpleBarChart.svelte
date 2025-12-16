<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  const data = [4, 8, 15, 16, 23, 42];

  let container: HTMLDivElement | null = null;

  onMount(() => {
    if (!container) return;

    const width = 240;
    const height = 80;

    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data) ?? 0])
      .range([height, 0]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (_, i) => x(i.toString()) ?? 0)
      .attr('y', (d) => y(d))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d))
      .attr('class', 'fill-sky-400');
  });
</script>

<div bind:this={container} class="w-full overflow-x-auto" aria-label="Simple bar chart" />


