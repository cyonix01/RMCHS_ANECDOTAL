import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataItem {
  category: string;
  count: number;
}

interface AnecdoteChartProps {
  data: DataItem[];
}

const AnecdoteChart: React.FC<AnecdoteChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const updateChart = () => {
        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const containerWidth = containerRef.current?.clientWidth || 600;
        const margin = { top: 20, right: 40, bottom: 40, left: 100 };
        const width = containerWidth - margin.left - margin.right;
        const height = 240 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
          .domain([0, d3.max(data, (d: DataItem) => d.count) || 0])
          .range([0, width]);

        const y = d3.scaleBand()
          .range([0, height])
          .domain(data.map(d => d.category))
          .padding(0.3);

        // Add axes
        svg.append('g')
          .call(d3.axisLeft(y).tickSize(0))
          .selectAll('text')
          .style('font-size', '10px')
          .style('font-family', 'Inter, sans-serif')
          .style('font-weight', '600')
          .attr('class', 'text-slate-600');

        svg.append('g')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
          .selectAll('text')
          .style('font-size', '10px')
          .attr('class', 'text-slate-400');

        // Remove domain lines for cleaner look
        svg.selectAll('.domain').attr('stroke', '#e2e8f0');
        svg.selectAll('.tick line').attr('stroke', '#f1f5f9');

        // Bars with animation
        const bars = svg.selectAll<SVGRectElement, DataItem>('rect')
          .data(data)
          .enter()
          .append('rect')
          .attr('x', x(0))
          .attr('y', (d: DataItem) => y(d.category)!)
          .attr('width', 0) // Start width 0 for animation
          .attr('height', y.bandwidth())
          .attr('fill', '#76DA0D')
          .attr('rx', 3)
          .attr('class', 'cursor-pointer hover:fill-[#88F015] transition-colors duration-200');

        const tooltip = d3.select(containerRef.current).select('#d3-tooltip');

        bars.on('mouseenter', function(event, d: DataItem) {
          tooltip
            .style('display', 'block')
            .style('opacity', '1')
            .html(`
              <div class="flex flex-col gap-0.5">
                <span class="text-[#76DA0D]">${d.category}</span>
                <span>Count: ${d.count}</span>
              </div>
            `);
        })
        .on('mousemove', function(event) {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          tooltip
            .style('left', mouseX + 'px')
            .style('top', mouseY + 'px');
        })
        .on('mouseleave', function() {
          tooltip.style('display', 'none').style('opacity', '0');
        });

        bars.transition()
          .duration(800)
          .attr('width', (d: DataItem) => x(d.count));

        // Add labels
        svg.selectAll('.label')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'label')
          .attr('x', x(0))
          .attr('y', (d: DataItem) => y(d.category)! + y.bandwidth() / 2 + 4)
          .text((d: DataItem) => d.count)
          .style('font-size', '10px')
          .style('font-weight', '700')
          .attr('fill', '#102604')
          .attr('opacity', 0)
          .transition()
          .duration(800)
          .delay(400)
          .attr('x', (d: DataItem) => x(d.count) + 8)
          .attr('opacity', 1);
    };

    updateChart();
    
    const resizeObserver = new ResizeObserver(() => updateChart());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[240px] relative">
      <svg ref={svgRef} className="w-full h-full"></svg>
      <div 
        id="d3-tooltip" 
        className="absolute hidden bg-[#102604] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded shadow-lg pointer-events-none z-50 transition-opacity duration-200 border border-[#76DA0D]/20"
        style={{ transform: 'translate(-50%, -100%)', marginTop: '-8px' }}
      ></div>
    </div>
  );
};

export default AnecdoteChart;
